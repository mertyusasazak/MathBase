'use client'

import React from 'react'
import Card from '@/components/ui/Card'
import { Button, Badge } from '@/components/ui/Common'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { Entry, Source } from '@/types'
import { TYPE_COLORS } from '@/lib/core/constants'

interface DashboardViewProps {
  entries: Entry[]
  sources: Source[]
  onSelectEntry: (entry: Entry) => void
  onCreateEntry: () => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  entries,
  sources,
  onSelectEntry,
  onCreateEntry
}) => {
  const [importData, setImportData] = React.useState<any>(null)
  const [importMode, setImportMode] = React.useState<'merge' | 'replace'>('merge')
  const [isImporting, setIsImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json.version !== '1.0') {
          alert('Invalid file version. Only version 1.0 is supported.')
          return
        }
        setImportData(json)
      } catch (err) {
        alert('Error reading file. Please ensure it is a valid JSON file.')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const confirmImport = async () => {
    if (!importData) return
    setIsImporting(true)
    try {
      const res = await fetch(`/api/import/json?mode=${importMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      alert(`Import completed!\nImported: ${data.imported}\nSkipped: ${data.skipped}\n${data.errors?.length ? `Errors: ${data.errors.length}` : ''}`)
      window.location.reload() // Dashboard'u tazelemek için
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsImporting(false)
      setImportData(null)
    }
  }

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Entries', value: entries.length },
    { label: 'Definitions', value: entries.filter(e => e.type === 'definition').length },
    { label: 'Theorems', value: entries.filter(e => e.type === 'theorem').length },
    { label: 'Sources', value: sources.length }
  ]

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 32,
      padding: '40px 60px',
      overflowY: 'auto'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'EB Garamond, serif',
          fontSize: '3.5rem',
          color: theme.colors.accent,
          marginBottom: 12
        }}>∂ MathBase</div>
        <div style={{
          fontFamily: 'Instrument Sans, sans-serif',
          fontSize: '0.85rem',
          color: theme.colors.textMuted,
          letterSpacing: '0.08em'
        }}>Your personal mathematical knowledge repository</div>
      </div>

      <style>{`
        .row-hover-group {
          position: relative;
          transition: all 0.2s ease-in-out;
          border: 1px solid ${theme.colors.border} !important;
        }
        .row-hover-group:hover {
          border-color: ${theme.colors.accent} !important;
          box-shadow: 0 0 12px ${theme.colors.accent}22;
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {stats.map(stat => {
          const typeKey = stat.label.toLowerCase().includes('source') ? 'source' : 
                         stat.label.toLowerCase().includes('theorem') ? 'theorem' :
                         stat.label.toLowerCase().includes('definition') ? 'definition' : 'accent';
          const baseColor = typeKey === 'accent' ? theme.colors.accent : (TYPE_COLORS as any)[typeKey];
          
          return (
            <Card 
              key={stat.label} 
              style={{ 
                textAlign: 'center', 
                padding: '24px 32px', 
                minWidth: 140,
                background: `${baseColor}08`, // Very subtle tint
                border: `1px solid ${baseColor}33`, // Themed border
              }}
            >
              <div style={{
                fontFamily: theme.typography.serif,
                fontSize: '2.5rem',
                color: baseColor,
                lineHeight: 1
              }}>{stat.value}</div>
              <div style={{
                fontFamily: theme.typography.sans,
                fontSize: '0.75rem',
                color: theme.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 10,
                fontWeight: 700
              }}>{stat.label}</div>
            </Card>
          );
        })}
      </div>

      {entries.length > 0 ? (
        <div style={{ width: '100%', maxWidth: 640 }}>
          <div style={{
            fontFamily: theme.typography.sans,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: theme.colors.textMuted,
            marginBottom: 16,
            fontWeight: 700
          }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentEntries.map(e => (
              <Card
                key={e.id}
                onClick={() => onSelectEntry(e)}
                className="row-hover-group"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Badge variant="solid" color={TYPE_COLORS[e.type]}>
                  {e.type.slice(0, 3)}
                </Badge>
                <span style={{
                  fontFamily: theme.typography.serif,
                  fontSize: '1.1rem',
                  flex: 1,
                  color: theme.colors.text
                }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                <span style={{
                  fontFamily: theme.typography.sans,
                  fontSize: '0.75rem',
                  color: theme.colors.textMuted
                }}>{new Date(e.updatedAt).toLocaleDateString()}</span>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Button
          variant="gold-solid"
          size="lg"
          onClick={onCreateEntry}
        >
          + Create your first entry
        </Button>
      )}

      {/* Yedekleme / Geri Yükleme Bölümü */}
      <div style={{ width: '100%', maxWidth: 640, marginTop: 40, paddingTop: 32, borderTop: `1px solid ${theme.colors.border}` }}>
        <div style={{
          fontFamily: theme.typography.sans,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: theme.colors.textMuted,
          marginBottom: 16,
          fontWeight: 700
        }}>Backup & Restore</div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Button variant="outline" onClick={() => window.open('/api/export/json', '_self')}>
            JSON Download
          </Button>

          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            JSON Upload
          </Button>
          <input
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* İçe Aktarma Onay Modalı */}
      {importData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
            padding: 32, borderRadius: 16, width: 480, maxWidth: '90%',
            fontFamily: theme.typography.sans
          }}>
            <h2 style={{ margin: '0 0 16px', color: theme.colors.text, fontFamily: theme.typography.serif }}>
              İçe Aktarımı Onayla
            </h2>
            <div style={{ color: theme.colors.textDim, marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Yüklenen dosyada şunlar bulundu:
              <ul style={{ margin: '12px 0 0 24px', padding: 0 }}>
                <li>{importData.entries?.length || 0} Entries</li>
                <li>{importData.sources?.length || 0} Sources</li>
                <li>{importData.relations?.length || 0} Relations</li>
                <li>{importData.tags?.length || 0} Tags</li>
              </ul>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, color: theme.colors.text, marginBottom: 8, fontSize: '0.85rem' }}>İçe Aktarım Modu</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.colors.text, cursor: 'pointer', marginBottom: 6 }}>
                <input type="radio" value="merge" checked={importMode === 'merge'} onChange={e => setImportMode(e.target.value as any)} />
                <span style={{ fontSize: '0.85rem' }}>Merge (Sadece yeni olanları ekler, eski veriler korunur)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.colors.danger, cursor: 'pointer' }}>
                <input type="radio" value="replace" checked={importMode === 'replace'} onChange={e => setImportMode(e.target.value as any)} />
                <span style={{ fontSize: '0.85rem' }}>Replace (CİDDİ UYARI: Mevcut tüm DB silinir, sadece dosyadan yüklenir)</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button variant="ghost" onClick={() => setImportData(null)} disabled={isImporting}>Cancel</Button>
              <Button variant="gold" onClick={confirmImport} disabled={isImporting}>
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

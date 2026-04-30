'use client'

import React, { useState } from 'react'
import {
  FileText, CheckCircle2, Loader2, Save,
  Trash2, LayoutGrid, List, Sparkles, ArrowUp, Tag, Key, Link2, X, Eye, Code, FileJson
} from 'lucide-react'
import { Button, Badge } from '@/components/ui/Common'
import { MathRenderer } from '@/lib/core/MathRenderer'
import { theme } from '@/lib/core/theme'
import { TYPE_COLORS, ENTRY_TYPES } from '@/lib/core/constants'
import { useAppContext } from '@/lib/context/AppContext'

interface Candidate {
  id?: string
  type: string
  title: string
  content: string
  tags: string[]
  keywords: string[]
  relations: any[]
  sourceTitle: string
  pageRange: string
  status?: 'pending' | 'saved' | 'error'
}

interface Props {
  onClose: () => void
  onComplete: () => void
}

export default function SmartImportView({ onClose, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [jsonRestoreData, setJsonRestoreData] = useState<any>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const { actions } = useAppContext()

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 300)
  }

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    
    if (selectedFile.name.endsWith('.json')) {
      handleJsonSelect(selectedFile)
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    
    setLoading(true)
    try {
      const res = await fetch('/api/import/pdf', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error('Extraction failed')
      const data = await res.json()
      const mapped = data.map((c: any, i: number) => ({
        ...c,
        id: `candidate-${Date.now()}-${i}`,
        status: 'pending',
        keywords: c.keywords || [],
        relations: c.relations || []
      }))
      setCandidates(mapped)

    } catch (err) {
      console.error(err)
      alert('Failed to extract data from PDF. Please ensure PyMuPDF is installed and the PDF is readable.')
    } finally {
      setLoading(false)
    }
  }

  const handleJsonSelect = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        setJsonRestoreData(json)
      } catch (err) {
        alert('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const handleConfirmRestore = async (mode: 'merge' | 'replace') => {
    if (!jsonRestoreData) return
    setLoading(true)
    try {
      const res = await fetch(`/api/import/json?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonRestoreData)
      })
      if (!res.ok) throw new Error('Restore failed')
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCandidate = (id: string, updates: Partial<Candidate>) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const ensureSourceCreated = async () => {
    if (sourceId) return sourceId
    if (!file) return null

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          sourceType: 'pdf',
          filepath: `/uploads/${file.name}`,
          pageRange: `1-${candidates.length > 0 ? Math.max(...candidates.map((x:any) => parseInt(x.pageRange) || 0)) : 1}`
        })
      })
      if (res.ok) {
        const data = await res.json()
        setSourceId(data.id)
        return data.id
      }
    } catch (err) {
      console.error('Lazy source creation failed:', err)
    }
    return null
  }

  const handleSaveOne = async (candidate: Candidate) => {
    handleUpdateCandidate(candidate.id!, { status: 'pending' })
    const sid = await ensureSourceCreated()
    
    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: candidate.type,
          title: candidate.title,
          content: candidate.content,
          tags: candidate.tags,
          manualKeywords: candidate.keywords,
          sourceId: sid,
          pageRange: candidate.pageRange,
          relationTitles: candidate.relations
        })
      })
      if (!res.ok) throw new Error('Save failed')
      handleUpdateCandidate(candidate.id!, { status: 'saved' })
      actions.refreshAll()
    } catch (err) {
      handleUpdateCandidate(candidate.id!, { status: 'error' })
    }
  }

  const handleSaveSelected = async () => {
    const toSave = candidates.filter(c => selectedIds.has(c.id!) && c.status === 'pending')
    for (const c of toSave) {
      await handleSaveOne(c)
    }
    setSelectedIds(new Set())
  }

  const handleSaveAll = async () => {
    const pending = candidates.filter(c => c.status === 'pending')
    for (const c of pending) {
      await handleSaveOne(c)
    }
    onComplete()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCancel = () => {
    if (candidates.length > 0 || file || jsonRestoreData) {
      setCandidates([])
      setFile(null)
      setSelectedIds(new Set())
      setJsonRestoreData(null)
      setSourceId(null)
    } else {
      onClose()
    }
  }

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="custom-scrollbar" 
      style={{ 
        width: '100%',
        height: '100%', 
        overflowY: 'auto',
        position: 'relative',
        background: 'var(--bg)',
        zIndex: 10
      }}
    >
      {/* HEADER */}
      <div 
        style={{ 
          background: 'var(--bg)',
          padding: '32px 48px 24px',
          borderBottom: (candidates.length > 0 || jsonRestoreData) ? `1px solid ${theme.colors.border}` : 'none',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          gap: 24 
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <FileText size={32} color={theme.colors.accent} strokeWidth={1.5} />
            <h1 style={{ 
              fontFamily: theme.typography.serif, 
              fontSize: '2.2rem', 
              fontWeight: 800, 
              color: theme.colors.text,
              margin: 0,
              letterSpacing: '-0.02em'
            }}>PDF / JSON Import</h1>
          </div>
          <p style={{ 
            color: theme.colors.textMuted, 
            margin: '8px 0 0', 
            fontSize: '1.05rem',
            maxWidth: 800
          }}>
            Import a PDF for extraction or a JSON file for data restoration.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {candidates.length > 0 && (
            <div style={{ 
              display: 'flex', 
              background: 'rgba(255,255,255,0.03)', 
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 12,
              padding: 4
            }}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('grid')}
                style={{ 
                  background: viewMode === 'grid' ? theme.colors.accent : 'transparent',
                  color: viewMode === 'grid' ? theme.colors.onAccent : theme.colors.textMuted,
                  borderRadius: 8,
                  width: 36, height: 36, padding: 0
                }}
                icon={<LayoutGrid size={18} />}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('list')}
                style={{ 
                  background: viewMode === 'list' ? theme.colors.accent : 'transparent',
                  color: viewMode === 'list' ? theme.colors.onAccent : theme.colors.textMuted,
                  borderRadius: 8,
                  width: 36, height: 36, padding: 0
                }}
                icon={<List size={18} />}
              />
            </div>
          )}
          {(candidates.length > 0 || file || jsonRestoreData) && (
            <Button 
              variant="gold" 
              onClick={handleCancel}
              style={{ height: 44, padding: '0 20px' }}
            >
              Cancel
            </Button>
          )}
          {candidates.length > 0 && (
            <>
              {selectedIds.size > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="md"
                    onClick={() => setSelectedIds(new Set())}
                    style={{ padding: '0 16px', height: 44, borderColor: theme.colors.border }}
                  >
                    Clear Selection
                  </Button>
                  <Button 
                    variant="gold" 
                    size="md"
                    onClick={handleSaveSelected}
                    style={{ 
                      padding: '0 24px', 
                      height: 44, 
                      background: theme.colors.accent,
                      color: theme.colors.onAccent || '#000', 
                      fontWeight: 700
                    }}
                    icon={<Sparkles size={20} color={theme.colors.onAccent || '#000'} />}
                  >
                    Save Selected ({selectedIds.size})
                  </Button>
                </>
              )}
              <Button 
                variant="gold" 
                size="md"
                onClick={handleSaveAll}
                disabled={candidates.every(c => c.status === 'saved')}
                style={{ padding: '0 24px', height: 44 }}
                icon={<Save size={20} />}
              >
                Approve All
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '40px 48px 100px' }}>
      {/* DROPZONE OR CONTENT */}
      {candidates.length === 0 && !loading && !jsonRestoreData ? (
        <div 
          onClick={() => document.getElementById('file-upload')?.click()}
          style={{
            height: 400,
            border: `2px dashed ${theme.colors.border}`,
            borderRadius: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: `${theme.colors.surface}33`,
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <FileText size={48} color={theme.colors.accent} />
            <FileJson size={48} color={theme.colors.accent} />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: theme.colors.text }}>Upload File to Import</h2>
          <p style={{ color: theme.colors.textMuted }}>Support PDF (Extraction) and JSON (Backup Restore)</p>
          <input 
            id="file-upload" 
            type="file" 
            accept=".pdf,.json" 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </div>
      ) : loading ? (
        <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={48} color={theme.colors.accent} className="animate-spin" style={{ marginBottom: 20 }} />
          <h2 style={{ fontSize: '1.5rem', color: theme.colors.text }}>Processing File...</h2>
        </div>
      ) : jsonRestoreData ? (
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: `${theme.colors.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: theme.colors.accent }}>
            <FileJson size={40} />
          </div>
          <h2 style={{ fontSize: '1.8rem', color: theme.colors.text, marginBottom: 12 }}>JSON Restore</h2>
          <p style={{ color: theme.colors.textMuted, marginBottom: 40 }}>How would you like to restore this backup?</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Button variant="gold" fullWidth size="lg" onClick={() => handleConfirmRestore('merge')} style={{ height: 56, fontSize: '1rem' }}>
              Merge (Keep Existing Data)
            </Button>
            <Button variant="outline" fullWidth size="lg" onClick={() => handleConfirmRestore('replace')} style={{ height: 56, fontSize: '1rem', color: theme.colors.danger }}>
              Replace (Wipe & Restore)
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setJsonRestoreData(null)}>
              Back to Upload
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(450px, 1fr))' : '1fr', 
          gap: 32 
        }}>
          {candidates.map((c) => (
            <CandidateCard 
              key={c.id} 
              candidate={c} 
              viewMode={viewMode}
              isSelected={selectedIds.has(c.id!)}
              onToggleSelect={() => toggleSelect(c.id!)}
              onUpdate={(u) => handleUpdateCandidate(c.id!, u)}
              onDelete={() => {
                setCandidates(prev => prev.filter(x => x.id !== c.id))
                setSelectedIds(prev => {
                  const next = new Set(prev)
                  next.delete(c.id!)
                  return next
                })
              }}
            />
          ))}
        </div>
      )}
      </div>

      {/* BACK TO TOP BUTTON */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: 40,
            right: 40,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: theme.colors.accent,
            color: theme.colors.background,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: `0 10px 40px ${theme.colors.accent}66`,
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out'
          }}
          className="btn-action-animate"
        >
          <ArrowUp size={24} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

function CandidateCard({ candidate, viewMode, isSelected, onToggleSelect, onUpdate, onSave, onDelete }: { 
  candidate: Candidate, 
  viewMode: 'grid' | 'list',
  isSelected: boolean,
  onToggleSelect: () => void,
  onUpdate: (u: Partial<Candidate>) => void,
  onSave: () => void,
  onDelete: () => void
}) {
  const isSaved = candidate.status === 'saved'
  const isError = candidate.status === 'error'
  const [isPreview, setIsPreview] = useState(false)

  const isList = viewMode === 'list'

  return (
    <div style={{
      background: theme.colors.surface,
      border: `1px solid ${isSaved ? theme.colors.success : theme.colors.border}`,
      borderRadius: 20,
      padding: isList ? '20px 32px' : 32,
      display: 'flex',
      flexDirection: isList ? 'row' : 'column',
      alignItems: isList ? 'center' : 'stretch',
      gap: 24,
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: isSaved ? 0.6 : 1,
      transform: isSaved ? 'scale(0.98)' : 'none'
    }}>
      {isSaved && (
        <div style={{
          position: 'absolute', top: -12, right: 32,
          background: theme.colors.success, color: 'white',
          padding: '6px 16px', borderRadius: 24, fontSize: '0.75rem',
          fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          zIndex: 5
        }}>
          <CheckCircle2 size={14} /> SAVED
        </div>
      )}

      <div style={{ flex: isList ? '0 0 240px' : 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select 
            value={candidate.type}
            onChange={(e) => onUpdate({ type: e.target.value })}
            disabled={isSaved}
            style={{
              background: `${TYPE_COLORS[candidate.type] || theme.colors.accent}22`,
              color: TYPE_COLORS[candidate.type] || theme.colors.accent,
              border: `1px solid ${TYPE_COLORS[candidate.type] || theme.colors.accent}44`,
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              outline: 'none'
            }}
          >
            {ENTRY_TYPES.map(t => (
              <option key={t} value={t} style={{ background: theme.colors.surface, color: theme.colors.text }}>{t}</option>
            ))}
          </select>
          <Badge variant="muted" style={{ padding: '4px 10px' }}>Page {candidate.pageRange}</Badge>
        </div>

        <input 
          value={candidate.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          disabled={isSaved}
          placeholder="Enter title..."
          style={{
            fontFamily: theme.typography.serif,
            fontSize: isList ? '1.3rem' : '1.6rem',
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            color: theme.colors.accent,
            width: '100%',
            outline: 'none',
            padding: 0
          }}
        />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 4 }}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsPreview(!isPreview)}
            style={{ background: `${theme.colors.background}cc`, backdropFilter: 'blur(4px)', padding: '2px 8px', fontSize: '0.65rem', height: 24 }}
          >
            {isPreview ? <><Code size={12} style={{marginRight:4}}/> Edit</> : <><Eye size={12} style={{marginRight:4}}/> Preview</>}
          </Button>
        </div>

        {isPreview ? (
          <div style={{
            width: '100%', fontFamily: theme.typography.sans, fontSize: '0.9rem', lineHeight: 1.7,
            background: `${theme.colors.background}44`, border: `1px solid ${theme.colors.border}`,
            borderRadius: 12, padding: '16px', color: theme.colors.text, minHeight: isList ? 80 : 160, maxHeight: 300, overflowY: 'auto'
          }}>
            <MathRenderer content={candidate.content} />
          </div>
        ) : (
          <textarea 
            value={candidate.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            disabled={isSaved}
            style={{
              width: '100%', fontFamily: theme.typography.sans, fontSize: '0.9rem', lineHeight: 1.7,
              background: `${theme.colors.background}44`, border: `1px solid ${theme.colors.border}`,
              borderRadius: 12, padding: '16px', color: theme.colors.text, minHeight: isList ? 80 : 160, maxHeight: 300, resize: 'vertical', outline: 'none'
            }}
          />
        )}

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', width: 80 }}>
              <Tag size={14} /> Tags
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {candidate.tags.map((t, idx) => (
                <Badge key={idx} variant="solid" style={{ gap: 4, paddingRight: 4 }}>
                  {t}
                  {!isSaved && <span onClick={() => onUpdate({ tags: candidate.tags.filter(x => x !== t) })} style={{ cursor: 'pointer' }}><X size={10} /></span>}
                </Badge>
              ))}
              {!isSaved && (
                <input 
                  placeholder="+ Tag"
                  onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { onUpdate({ tags: [...candidate.tags, e.currentTarget.value.trim()] }); e.currentTarget.value = '' }}}
                  style={{ background: 'transparent', border: `1px dashed ${theme.colors.border}`, borderRadius: 8, padding: '2px 8px', fontSize: '0.7rem', color: theme.colors.text, width: 70, outline: 'none' }}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', width: 80 }}>
              <Key size={14} /> Keys
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {candidate.keywords.map((k, idx) => (
                <Badge key={idx} style={{ background: `${theme.colors.accent}11`, color: theme.colors.accent, borderColor: `${theme.colors.accent}33`, gap: 4, paddingRight: 4 }}>
                  {k}
                  {!isSaved && <span onClick={() => onUpdate({ keywords: candidate.keywords.filter(x => x !== k) })} style={{ cursor: 'pointer' }}><X size={10} /></span>}
                </Badge>
              ))}
              {!isSaved && (
                <input 
                  placeholder="+ Key"
                  onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { onUpdate({ keywords: [...candidate.keywords, e.currentTarget.value.trim()] }); e.currentTarget.value = '' }}}
                  style={{ background: 'transparent', border: `1px dashed ${theme.colors.border}`, borderRadius: 8, padding: '2px 8px', fontSize: '0.7rem', color: theme.colors.text, width: 70, outline: 'none' }}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', width: 80 }}>
              <Link2 size={14} /> Relations
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {candidate.relations.map((r, idx) => (
                <Badge key={idx} style={{ background: `${theme.colors.success}11`, color: theme.colors.success, borderColor: `${theme.colors.success}33`, gap: 4, paddingRight: 4 }}>
                  {r}
                  {!isSaved && <span onClick={() => onUpdate({ relations: candidate.relations.filter(x => x !== r) })} style={{ cursor: 'pointer' }}><X size={10} /></span>}
                </Badge>
              ))}
              {!isSaved && (
                <input 
                  placeholder="+ Relation (Title)"
                  onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { onUpdate({ relations: [...candidate.relations, e.currentTarget.value.trim()] }); e.currentTarget.value = '' }}}
                  style={{ background: 'transparent', border: `1px dashed ${theme.colors.border}`, borderRadius: 8, padding: '2px 8px', fontSize: '0.7rem', color: theme.colors.text, width: 120, outline: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isList ? 'row' : 'column', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        {!isSaved && (
          <div 
            onClick={onToggleSelect}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `2px solid ${isSelected ? theme.colors.accent : theme.colors.border}`,
              background: isSelected ? theme.colors.accent : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: isList ? 0 : 8
            }}
          >
            {isSelected && <CheckCircle2 size={18} color={theme.colors.onAccent || '#000'} strokeWidth={3} />}
          </div>
        )}
        <Button 
          variant="ghost" 
          onClick={onDelete}
          disabled={isSaved}
          style={{ color: theme.colors.danger, width: isList ? 44 : '100%', height: 44, padding: 0 }}
          icon={<Trash2 size={20} />}
        />
      </div>
    </div>
  )
}

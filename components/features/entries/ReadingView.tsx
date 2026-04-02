'use client'

import React from 'react'
import {
  ArrowLeft, FileText, Pencil, Sparkles, X, ChevronLeft, ChevronRight, Key, BookOpen, ArrowRight, Link2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { MathRenderer } from '@/lib/core/MathRenderer'
import AIPanel from '@/components/features/ai/AIPanel'
import { Entry, Source, Relation } from '@/types'
import { TYPE_COLORS, RELATION_LABELS } from '@/lib/core/constants'
import { exportToPDF } from '@/components/features/pdf/PDFExport'

interface ReadingViewProps {
  selected: Entry
  entries: Entry[]
  sources: Source[]
  relations: Relation[]
  showAI: boolean
  setShowAI: (show: boolean) => void
  onEdit: () => void
  onBack: () => void
  onSelectEntry: (entry: Entry) => void
  sortedEntries: Entry[]
  aiWidth: number
  onStartResizingAI: (e: React.MouseEvent) => void
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  selected,
  entries,
  sources,
  relations,
  showAI,
  setShowAI,
  onEdit,
  onBack,
  onSelectEntry,
  sortedEntries,
  aiWidth,
  onStartResizingAI
}) => {
  const [expandKeywords, setExpandKeywords] = React.useState(false)

  const getEntryRelations = (entryId: number) => {
    const outgoing = relations.filter(r => r.fromEntryId === entryId)
    const incoming = relations.filter(r => r.toEntryId === entryId)
    return { outgoing, incoming }
  }

  const { outgoing, incoming } = getEntryRelations(selected.id)
  const sections: { label: string; entries: { entry: Entry; rel: string }[] }[] = []

  // Group outgoing by relation type
  const outByType: Record<string, Entry[]> = {}
  outgoing.forEach(r => {
    const e = entries.find(x => x.id === r.toEntryId)
    if (e) {
      if (!outByType[r.relationType]) outByType[r.relationType] = []
      outByType[r.relationType].push(e)
    }
  })
  Object.entries(outByType).forEach(([type, ents]) => {
    sections.push({ label: RELATION_LABELS[type] || type.replace(/_/g, ' '), entries: ents.map(e => ({ entry: e, rel: type })) })
  })

  // Group incoming as "Used by"
  const usedByMap = new Map<number, Entry>()
  incoming.forEach(r => {
    const e = entries.find(x => x.id === r.fromEntryId)
    if (e) usedByMap.set(e.id, e)
  })
  if (usedByMap.size > 0) sections.push({ label: 'Used By', entries: Array.from(usedByMap.values()).map(e => ({ entry: e, rel: 'used_by' })) })

  // Sequential Navigation
  const currentIndex = sortedEntries.findIndex(e => e.id === selected.id)
  const prevEntry = currentIndex > 0 ? sortedEntries[currentIndex - 1] : null
  const nextEntry = currentIndex < sortedEntries.length - 1 ? sortedEntries[currentIndex + 1] : null

  const src = sources.find(s => s.id === selected.sourceId)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* HEADER */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: `${theme.colors.background}cc`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button variant="outline" size="sm" onClick={onBack} icon={<ArrowLeft size={16} />}>Back</Button>
            <Badge variant="solid" color={TYPE_COLORS[selected.type]}>{selected.type}</Badge>
            <h1 style={{
              fontFamily: theme.typography.serif,
              fontSize: '1.4rem',
              fontWeight: 600,
              margin: 0,
              color: theme.colors.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 400
            }} dangerouslySetInnerHTML={{ __html: renderTitle(selected.title) }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button variant="outline" size="sm" onClick={() => exportToPDF([selected])} icon={<FileText size={14} />}>PDF</Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => setShowAI(!showAI)}
              icon={showAI ? <X size={14} /> : <Sparkles size={14} />}
              style={{ border: `1px solid ${theme.colors.success}80`, background: `${theme.colors.success}10` }}
            >
              {showAI ? 'Hide AI' : 'Questions?'}
            </Button>
            <Button variant="gold" size="sm" onClick={onEdit} icon={<Pencil size={14} />}>Edit</Button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '32px 40px', maxWidth: 840, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'EB Garamond, serif',
            fontSize: '2.5rem',
            fontWeight: 600,
            lineHeight: 1.2,
            margin: '0 0 24px',
            color: '#e8e6df'
          }} dangerouslySetInnerHTML={{ __html: renderTitle(selected.title) }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {selected.tags.map(t => (
              <span key={t} style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '0.72rem',
                padding: '3px 9px',
                borderRadius: 20,
                border: '1px solid #2a2a33',
                color: '#7a7870'
              }}>#{t}</span>
            ))}
          </div>

          {selected.symbolKeywords && selected.symbolKeywords.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#7a7870',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Key size={12} /> Keywords
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(expandKeywords ? selected.symbolKeywords : selected.symbolKeywords.slice(0, 5)).map(k => (
                  <span key={k} style={{
                    fontFamily: 'Instrument Sans, sans-serif',
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#7eb8b015',
                    border: '1px solid #7eb8b033',
                    color: '#7eb8b0'
                  }}>{k}</span>
                ))}
                {!expandKeywords && selected.symbolKeywords.length > 5 && (
                  <button
                    onClick={() => setExpandKeywords(true)}
                    title={selected.symbolKeywords.slice(5).join(', ')}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${theme.colors.accent}`,
                      fontFamily: 'Instrument Sans, sans-serif',
                      fontSize: '0.65rem',
                      color: theme.colors.accent,
                      cursor: 'pointer',
                      alignSelf: 'center',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontWeight: 700,
                      marginLeft: 4,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = theme.colors.accent
                      e.currentTarget.style.color = theme.colors.background
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = theme.colors.accent
                    }}
                  >
                    +{selected.symbolKeywords.length - 5} more
                  </button>
                )}
                {expandKeywords && selected.symbolKeywords.length > 5 && (
                  <button
                    onClick={() => setExpandKeywords(false)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${theme.colors.accent}`,
                      fontFamily: 'Instrument Sans, sans-serif',
                      fontSize: '0.65rem',
                      color: theme.colors.accent,
                      cursor: 'pointer',
                      alignSelf: 'center',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontWeight: 700,
                      marginLeft: 4,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = theme.colors.accent
                      e.currentTarget.style.color = theme.colors.background
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = theme.colors.accent
                    }}
                  >
                    show less
                  </button>
                )}
              </div>
            </div>
          )}

          {src && (
            <div
              onClick={() => src.filepath && window.open(src.filepath, '_blank')}
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                background: '#16161a',
                border: '1px solid #2a2a33',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: src.filepath ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <BookOpen size={18} color="#c9a84c" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.85rem', color: '#e8e6df', fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: renderTitle(src.title) }} />
                <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: '#7a7870', marginTop: 2 }}>
                  {src.sourceType.toUpperCase()}{selected.pageRange ? ` · pp. ${selected.pageRange}` : ''}
                </div>
              </div>
              {src.filepath && <ArrowRight size={16} color="#c9a84c" opacity={0.6} />}
            </div>
          )}

          <div style={{ borderTop: '1px solid #2a2a33', paddingTop: 22, marginBottom: 32 }}>
            <MathRenderer content={selected.content} />
          </div>

          {sections.length > 0 && (
            <div style={{ borderTop: '1px solid #2a2a33', paddingTop: 24 }}>
              <div style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#7a7870',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Link2 size={14} /> Relationships
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {sections.map(sec => (
                  <div key={sec.label}>
                    <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: '#c9a84c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{sec.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {sec.entries.map(({ entry: e }) => (
                        <button key={e.id} onClick={() => onSelectEntry(e)} style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #2a2a33',
                          background: '#16161a',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          transition: 'all 0.2s ease-in-out'
                        }}>
                          <span style={{
                            color: TYPE_COLORS[e.type],
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            background: `${TYPE_COLORS[e.type]}15`,
                            borderRadius: 4,
                            alignSelf: 'flex-start'
                          }}>{e.type}</span>
                          <span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.05rem', color: '#e8e6df', lineHeight: 1.2 }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEQ NAV */}
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', gap: 20 }}>
            {prevEntry ? (
              <Button variant="outline" onClick={() => onSelectEntry(prevEntry)} style={{ flex: 1, height: 'auto', padding: '14px 20px', justifyContent: 'flex-start' }} icon={<ChevronLeft size={20} />}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted }}>Previous Entry</div>
                  <div style={{ fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: renderTitle(prevEntry.title) }} />
                </div>
              </Button>
            ) : <div style={{ flex: 1 }} />}
            {nextEntry ? (
              <Button variant="outline" onClick={() => onSelectEntry(nextEntry)} style={{ flex: 1, height: 'auto', padding: '14px 20px', justifyContent: 'flex-end' }} icon={<ChevronRight size={20} />} iconPosition="right">
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted }}>Next Entry</div>
                  <div style={{ fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: renderTitle(nextEntry.title) }} />
                </div>
              </Button>
            ) : <div style={{ flex: 1 }} />}
          </div>
        </div>
      </div>

      {/* AI PANEL */}
      <div style={{ display: showAI ? 'flex' : 'none', width: aiWidth, minWidth: 340, borderLeft: '1px solid #2a2a33', background: '#16161a', flexDirection: 'column', position: 'relative' }}>
        <div onMouseDown={onStartResizingAI} style={{ position: 'absolute', top: 0, left: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 50 }} />
        <AIPanel entryId={selected.id} entryTitle={selected.title} />
      </div>
    </div>
  )
}

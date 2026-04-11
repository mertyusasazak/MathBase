'use client'

import React from 'react'
import {
  ArrowLeft, FileText, Pencil, ChevronLeft, ChevronRight, Key, BookOpen, ArrowRight, Link2
} from 'lucide-react'
import { Button, Badge } from '@/components/ui/Common'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { MathRenderer } from '@/lib/core/MathRenderer'
import { Entry, Source, Relation } from '@/types'
import { TYPE_COLORS } from '@/lib/core/constants'
import { exportToPDF } from '@/components/features/pdf/PDFExport'
import { useReadingView } from '@/hooks/useReadingView'

interface ReadingViewProps {
  selected: Entry
  entries: Entry[]
  sources: Source[]
  relations: Relation[]
  onEdit: () => void
  onBack: () => void
  onSelectEntry: (entry: Entry) => void
  sortedEntries: Entry[]
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  selected,
  entries,
  sources,
  relations,
  onEdit,
  onBack,
  onSelectEntry,
  sortedEntries,
}) => {
  const { state, actions } = useReadingView({
    selected,
    entries,
    relations,
    sortedEntries
  })

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
            color: theme.colors.text
          }} dangerouslySetInnerHTML={{ __html: renderTitle(selected.title) }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {selected.tags.map(t => (
              <span key={t} style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '0.72rem',
                padding: '3px 9px',
                borderRadius: 20,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.textMuted
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
                color: theme.colors.textMuted,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Key size={12} /> Keywords
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(state.expandKeywords ? selected.symbolKeywords : selected.symbolKeywords.slice(0, 5)).map(k => (
                  <span key={k} style={{
                    fontFamily: 'Instrument Sans, sans-serif',
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: theme.colors.successMuted,
                    border: `1px solid ${theme.colors.success}44`,
                    color: theme.colors.success
                  }}>{k}</span>
                ))}
                {!state.expandKeywords && selected.symbolKeywords.length > 5 && (
                  <button
                    onClick={() => actions.setExpandKeywords(true)}
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
                {state.expandKeywords && selected.symbolKeywords.length > 5 && (
                  <button
                    onClick={() => actions.setExpandKeywords(false)}
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
              className={src.filepath ? "glow-card" : ""}
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                background: theme.colors.sourceMuted,
                border: `1px solid ${theme.colors.source}44`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: src.filepath ? 'pointer' : 'default'
              }}
            >
              <BookOpen size={18} color={theme.colors.accent} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.85rem', color: theme.colors.text, fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: renderTitle(src.title) }} />
                <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: theme.colors.textMuted, marginTop: 2 }}>
                  {src.sourceType.toUpperCase()}{selected.pageRange ? ` · pp. ${selected.pageRange}` : ''}
                </div>
              </div>
              {src.filepath && <ArrowRight size={16} color={theme.colors.accent} opacity={0.6} />}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: 22, marginBottom: 32 }}>
            <MathRenderer content={selected.content} />
          </div>
 
          {state.sections.length > 0 && (
            <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: 24 }}>
              <div style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: theme.colors.textMuted,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Link2 size={14} /> Relationships
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {state.sections.map(sec => (
                  <div key={sec.label}>
                    <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: theme.colors.accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{sec.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {sec.entries.map(({ entry: e }) => (
                        <button key={e.id} onClick={() => onSelectEntry(e)} className="glow-card" style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: `1px solid ${theme.colors.border}`,
                          background: theme.colors.surface,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12
                        }}>
                          <span style={{
                            color: TYPE_COLORS[e.type],
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            background: `${TYPE_COLORS[e.type]}15`,
                            borderRadius: 4,
                            whiteSpace: 'nowrap'
                          }}>{e.type}</span>
                          <span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.05rem', color: theme.colors.text, lineHeight: 1.2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
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
            {state.prevEntry ? (
              <Button variant="outline" onClick={() => onSelectEntry(state.prevEntry!)} style={{ flex: 1, height: 'auto', padding: '14px 20px', justifyContent: 'flex-start' }} icon={<ChevronLeft size={20} />}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted }}>Previous Entry</div>
                  <div style={{ fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: renderTitle(state.prevEntry.title) }} />
                </div>
              </Button>
            ) : <div style={{ flex: 1 }} />}
            {state.nextEntry ? (
              <Button variant="outline" onClick={() => onSelectEntry(state.nextEntry!)} style={{ flex: 1, height: 'auto', padding: '14px 20px', justifyContent: 'flex-end' }} icon={<ChevronRight size={20} />} iconPosition="right">
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted }}>Next Entry</div>
                  <div style={{ fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: renderTitle(state.nextEntry.title) }} />
                </div>
              </Button>
            ) : <div style={{ flex: 1 }} />}
          </div>
        </div>
      </div>

    </div>
  )
}

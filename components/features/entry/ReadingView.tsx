'use client'

import React from 'react'
import {
  ArrowLeft, FileText, Pencil, ChevronLeft, ChevronRight, Key, BookOpen, ArrowRight, Link2, StickyNote, CheckCircle2, RotateCcw, ArrowUp
} from 'lucide-react'
import { Button, Badge } from '@/components/ui/Common'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { MathRenderer } from '@/lib/core/MathRenderer'
import { Entry, Source, Relation } from '@/types'
import { TYPE_COLORS, SOURCE_TYPE_COLORS } from '@/lib/core/constants'
import { useAppContext, THEME_COLORS } from '@/lib/context/AppContext'
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

  // --- Notes Panel Implementation ---
  const [localNotes, setLocalNotes] = React.useState(selected.personalNotes || '')
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'error'>('saved')
  const [isEditingNotes, setIsEditingNotes] = React.useState(false)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const notesSidebarRef = React.useRef<HTMLDivElement>(null)

  // Sync local state if entry changes
  React.useEffect(() => {
    setLocalNotes(selected.personalNotes || '')
    setSaveStatus('saved')
    setIsEditingNotes(false)
  }, [selected.id])

  // Handle click outside to auto-preview
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notesSidebarRef.current && !notesSidebarRef.current.contains(event.target as Node)) {
        setIsEditingNotes(false)
      }
    }
    if (isEditingNotes) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditingNotes])

  const handleNotesChange = (val: string) => {
    setLocalNotes(val)
    setSaveStatus('saving')

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/entry/${selected.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personalNotes: val })
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('saved')
        // Update global state so changes persist when switching views
        globalActions.refreshAll()
      } catch (err) {
        setSaveStatus('error')
        console.error('Auto-save error:', err)
      }
    }, 1000)
  }

  const { state: { themeMode, accentColor }, actions: globalActions } = useAppContext()
  const src = sources.find(s => s.id === selected.sourceId)

  const [showExportMenu, setShowExportMenu] = React.useState(false)
  const [showScrollTop, setShowScrollTop] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 300)
  }

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
      >
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
              color: theme.colors.accent,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 400
            }} dangerouslySetInnerHTML={{ __html: renderTitle(selected.title) }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                icon={<FileText size={14} />}
              >
                Export
              </Button>
              {showExportMenu && (
                <>
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 110,
                    background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
                    borderRadius: 12, padding: '8px 0', minWidth: 160, boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.2s ease-out', overflow: 'hidden'
                  }}>
                    <div
                      onClick={() => {
                        // Resolve the actual hex color from AppContext to pass to the API
                        const colors = THEME_COLORS[accentColor]
                        const hex = themeMode === 'dark' ? colors.dark : colors.light
                        exportToPDF([selected], hex, themeMode);
                        setShowExportMenu(false);
                      }}
                      style={{
                        padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: theme.colors.text,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.colors.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Export as PDF
                    </div>
                    <div
                      onClick={() => { window.open(`/api/export/json?id=${selected.id}`, '_self'); setShowExportMenu(false); }}
                      style={{
                        padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: theme.colors.text,
                        borderTop: `1px solid ${theme.colors.border}`, transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.colors.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Export as JSON
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button variant="gold" size="sm" onClick={onEdit} icon={<Pencil size={14} />}>Edit</Button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '32px 40px' }}>
          <h1 style={{
            fontFamily: 'EB Garamond, serif',
            fontSize: '2.5rem',
            fontWeight: 600,
            lineHeight: 1.2,
            margin: '0 0 24px',
            color: theme.colors.accent
          }} dangerouslySetInnerHTML={{ __html: renderTitle(selected.title) }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {selected.tags.map((t: string) => (
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
                {(state.expandKeywords ? selected.symbolKeywords : selected.symbolKeywords.slice(0, 5)).map((k: string) => (
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
              onClick={() => {
                if (!src.filepath) return
                const url = src.filepath.startsWith('http')
                  ? src.filepath
                  : `${window.location.origin}/${src.filepath.replace(/^\/+/, '')}`
                window.open(url, '_blank')
              }}
              className={src.filepath ? "glow-card" : ""}
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                background: `${SOURCE_TYPE_COLORS[src.sourceType] || SOURCE_TYPE_COLORS.other}12`,
                border: `1px solid ${SOURCE_TYPE_COLORS[src.sourceType] || SOURCE_TYPE_COLORS.other}33`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: src.filepath ? 'pointer' : 'default',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${SOURCE_TYPE_COLORS[src.sourceType] || SOURCE_TYPE_COLORS.other}18`,
                border: `1px solid ${SOURCE_TYPE_COLORS[src.sourceType] || SOURCE_TYPE_COLORS.other}22`
              }}>
                <BookOpen size={18} color={SOURCE_TYPE_COLORS[src.sourceType] || SOURCE_TYPE_COLORS.other} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.85rem', color: theme.colors.text, fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: renderTitle(src.title) }} />
                <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: theme.colors.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge variant="muted" color={SOURCE_TYPE_COLORS[src.sourceType] || SOURCE_TYPE_COLORS.other} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                    {src.sourceType}
                  </Badge>
                  {selected.pageRange ? ` · pp. ${selected.pageRange}` : ''}
                </div>
              </div>
              {src.filepath && <ArrowRight size={16} color={SOURCE_TYPE_COLORS[src.sourceType] || SOURCE_TYPE_COLORS.other} opacity={0.6} />}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: 22, marginBottom: 32 }}>
            <MathRenderer content={selected.content} />
          </div>

          {(state.outgoing.length > 0 || state.incoming.length > 0) && (
            <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: 24 }}>
              <div style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: theme.colors.textMuted,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Link2 size={14} /> Relationships
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* OUTGOING SECTION */}
                {state.outgoing.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.7rem', color: theme.colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Outgoing Relations <span style={{ opacity: 0.3 }}>—</span> <span style={{ color: theme.colors.accent }}>References</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {state.outgoing.map(({ entry: e, rel }: { entry: Entry, rel: string }) => (
                        <button key={e.id} onClick={() => onSelectEntry(e)} className="glow-card" style={{
                          padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.colors.border}`,
                          background: theme.colors.surface, cursor: 'pointer', textAlign: 'left',
                          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Badge variant="solid" color={TYPE_COLORS[e.type]} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>{e.type}</Badge>
                              <span style={{ fontSize: '0.6rem', color: theme.colors.accent, fontWeight: 700, textTransform: 'uppercase' }}>{rel}</span>
                            </div>
                            <span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.1rem', color: theme.colors.text, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                          </div>
                          <ChevronRight size={14} color={theme.colors.textMuted} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* INCOMING SECTION */}
                {state.incoming.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.7rem', color: theme.colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Incoming Relations <span style={{ opacity: 0.3 }}>—</span> <span style={{ color: theme.colors.accent }}>Referenced By</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {state.incoming.map(({ entry: e, rel }: { entry: Entry, rel: string }) => (
                        <button key={e.id} onClick={() => onSelectEntry(e)} className="glow-card" style={{
                          padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.colors.border}`,
                          background: theme.colors.surface, cursor: 'pointer', textAlign: 'left',
                          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Badge variant="solid" color={TYPE_COLORS[e.type]} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>{e.type}</Badge>
                              <span style={{ fontSize: '0.6rem', color: theme.colors.accent, fontWeight: 700, textTransform: 'uppercase' }}>{rel}</span>
                            </div>
                            <span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.1rem', color: theme.colors.text, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                          </div>
                          <ChevronRight size={14} color={theme.colors.textMuted} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEQ NAV */}
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', gap: 20 }}>
            {state.prevEntry ? (
              <Button
                variant="outline"
                onClick={() => onSelectEntry(state.prevEntry!)}
                style={{ flex: 1, height: 'auto', padding: '12px 16px', justifyContent: 'flex-start', gap: 12 }}
                icon={<ChevronLeft size={20} />}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, fontWeight: 500 }}>Previous Entry</div>
                  <div style={{ fontWeight: 600, color: theme.colors.text }} dangerouslySetInnerHTML={{ __html: renderTitle(state.prevEntry.title) }} />
                </div>
              </Button>
            ) : <div style={{ flex: 1 }} />}

            {state.nextEntry ? (
              <Button
                variant="outline"
                onClick={() => onSelectEntry(state.nextEntry!)}
                style={{ flex: 1, height: 'auto', padding: '12px 16px', justifyContent: 'flex-end', gap: 12 }}
                icon={<ChevronRight size={20} />}
                iconPosition="right"
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, fontWeight: 500 }}>Next Entry</div>
                  <div style={{ fontWeight: 600, color: theme.colors.text }} dangerouslySetInnerHTML={{ __html: renderTitle(state.nextEntry.title) }} />
                </div>
              </Button>
            ) : <div style={{ flex: 1 }} />}
          </div>
        </div>
      </div>

      {/* BACK TO TOP BUTTON */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: 40,
            right: 380, // Offset for the permanent 340px notes sidebar + 40px margin
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
            animation: 'fadeIn 0.3s ease-out',
            transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="btn-action-animate"
        >
          <ArrowUp size={24} strokeWidth={2.5} />
        </button>
      )}

      {/* NOTES SIDEBAR */}
      <div
        ref={notesSidebarRef}
        style={{
          width: 340,
          borderLeft: `1px solid ${theme.colors.border}`,
          background: theme.colors.surface,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out'
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.colors.accent }}>
            <StickyNote size={18} />
            <span style={{ fontFamily: theme.typography.sans, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveStatus === 'saving' && <RotateCcw size={12} className="spin" color={theme.colors.textMuted} />}
            {saveStatus === 'saved' && <CheckCircle2 size={12} color={theme.colors.success} />}
            <Button
              variant={isEditingNotes ? "gold" : "outline"}
              size="sm"
              onClick={() => setIsEditingNotes(!isEditingNotes)}
              style={{ fontSize: '0.65rem', padding: '2px 8px' }}
            >
              {isEditingNotes ? 'Preview' : 'Edit'}
            </Button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {isEditingNotes ? (
            <textarea
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Jot down your proof sketches, examples, or reminders here..."
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                padding: '20px',
                fontFamily: theme.typography.mono,
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: theme.colors.text,
                resize: 'none',
                outline: 'none',
                caretColor: theme.colors.accent
              }}
            />
          ) : (
            <div
              onClick={() => setIsEditingNotes(true)}
              style={{ padding: '20px', cursor: 'text', minHeight: '100%' }}
            >
              {localNotes ? (
                <MathRenderer content={localNotes} style={{ fontSize: '0.95rem', lineHeight: 1.6 }} />
              ) : (
                <div style={{ color: theme.colors.textMuted, fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No notes yet. Click to start writing...
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '12px 20px',
          fontSize: '0.7rem',
          color: theme.colors.textMuted,
          borderTop: `1px solid ${theme.colors.border}`,
          background: `${theme.colors.background}55`
        }}>
          Notes are automatically saved.
        </div>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Entry, SourceOption, EntryOption, Relation } from '@/types'
import { Trash2, Sparkles, X, Save, AlertTriangle, ChevronDown, ChevronUp, Link2, Tag, FileText } from 'lucide-react'
import { theme } from '@/lib/core/theme'
import { Button, Input, Select, Badge } from '@/components/ui/Common'
import { renderTitle } from '@/lib/core/math'
import { MathRenderer } from '@/lib/core/MathRenderer'
import { ENTRY_TYPES, TYPE_COLORS, RELATION_LABELS } from '@/lib/core/constants'
import { useEntryEditor, RELATION_TYPES } from '@/hooks/useEntryEditor'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface Props {
  initial?: Partial<Entry>
  allEntries?: EntryOption[]
  sources?: SourceOption[]
  initialRelations?: Relation[]
  onSave: (entry: Partial<Entry>, versionNote?: string) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

// Collapsible Section (Defined outside to prevent re-mounting and focus loss on typing)
const CollapsibleSection = ({
  id,
  label,
  icon: Icon,
  summary,
  isOpen,
  onToggle,
  children
}: {
  id: string,
  label: string,
  icon: any,
  summary: string,
  isOpen: boolean,
  onToggle: (id: string) => void,
  children: React.ReactNode
}) => (
  <div style={{ borderTop: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}>
    <div
      onClick={() => onToggle(id)}
      style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: theme.animations.fast
      }}
      onMouseEnter={e => e.currentTarget.style.background = theme.colors.surfaceHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={16} color={isOpen ? theme.colors.accent : theme.colors.textMuted} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isOpen ? theme.colors.text : theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label}
        </span>
        {!isOpen && (
          <span style={{ fontSize: '0.7rem', color: theme.colors.accent, opacity: 0.7, marginLeft: 8, fontWeight: 500 }}>
            {summary}
          </span>
        )}
      </div>
      {isOpen ? <ChevronUp size={16} color={theme.colors.textMuted} /> : <ChevronDown size={16} color={theme.colors.textMuted} />}
    </div>

    {isOpen && (
      <div style={{ padding: '0 20px 16px 20px', animation: 'fadeIn 0.2s ease-out' }}>
        {children}
      </div>
    )}
  </div>
)

export default function EntryEditor(props: Props) {
  const { initial, allEntries = [], sources = [] } = props
  
  // Separation of Logic:
  const { state, refs, actions } = useEntryEditor(props)

  // Dynamic Monaco Theme Binding
  const [monacoTheme, setMonacoTheme] = React.useState('vs-dark')
  React.useEffect(() => {
    const updateTheme = () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light'
      setMonacoTheme(isLight ? 'vs' : 'vs-dark')
    }
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      width: '100%',
      height: '100%',
      fontFamily: theme.typography.sans,
      background: theme.colors.background
    }}>

      {/* ── LEFT: Edit Panel ── */}
      <div style={{
        width: `${state.leftWidth}%`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: `1px solid ${theme.colors.border}`,
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: theme.colors.surface
        }}>
          <div style={{ width: 140 }}>
            <Select
              value={state.type}
              onChange={e => actions.setType(e.target.value)}
              options={ENTRY_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            />
          </div>
          <Input
            value={state.title}
            onChange={e => actions.setTitle(e.target.value)}
            placeholder="Analytical Mechanics, Cauchy-Schwarz, etc."
            fullWidth
            style={{ fontSize: '1.1rem', fontWeight: 600, border: 'none', background: 'transparent' }}
          />
        </div>

        {/* Combined Scroll Area (Consolidated logic for word-wrap and dark part fix) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Duplicate Warning */}
          {state.duplicates.length > 0 && (
            <div style={{ padding: '12px 20px', background: '#ffa50011', borderBottom: `1px solid #ffa50044`, display: 'flex', gap: 12, alignItems: 'center' }}>
              <AlertTriangle size={18} color="#ffa500" />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#ffa500', fontWeight: 600 }}>Similar entries already exist:</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {state.duplicates.slice(0, 2).map(d => (
                    <Badge key={d.id} variant="outline" style={{ fontSize: '0.7rem', borderColor: '#ffa50033', color: '#ffa500cc' }}>{d.title} ({d.type})</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Monaco Editor Container - Stretches to fill gap */}
          <div ref={refs.editorContainerRef} style={{ 
            flex: 1,
            width: '100%',
            overflow: 'hidden', 
            position: 'relative',
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <MonacoEditor
              height="100%"
              defaultLanguage="markdown"
              value={state.content}
              onChange={v => actions.setContent(v || '')}
              theme={monacoTheme}
              onMount={(editor) => {
                refs.editorRef.current = editor
              }}
              options={{
                fontSize: 14,
                fontFamily: theme.typography.mono,
                lineNumbers: 'on',
                minimap: { enabled: false },
                wordWrap: 'on',
                wrappingIndent: 'indent',
                wrappingStrategy: 'advanced',
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                quickSuggestions: false,
                fontLigatures: true,
                disableLayerHinting: true,
                automaticLayout: true,
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                scrollbar: {
                  vertical: 'hidden',
                  horizontal: 'hidden'
                }
              }}
            />
          </div>

          {/* Property Pane */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: theme.colors.surface,
            overflow: 'visible',
            borderTop: `1px solid ${theme.colors.border}`
          }}>
            {/* Source Selection */}
            <CollapsibleSection
              id="sources"
              label="Source"
              icon={FileText}
              isOpen={state.openSections.sources}
              onToggle={actions.toggleSection}
              summary={state.sourceId ? (sources.find(s => s.id === state.sourceId)?.title || 'Selected') + (state.pageRange ? ` (p.${state.pageRange})` : '') : 'None'}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    value={state.sourceId || ''}
                    onChange={e => actions.setSourceId(e.target.value ? parseInt(e.target.value) : null)}
                    options={[
                      { value: '', label: 'No source' },
                      ...sources.map(s => ({ value: s.id, label: `${s.title} (${s.sourceType})` }))
                    ]}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <Input
                    value={state.pageRange}
                    onChange={e => actions.setPageRange(e.target.value)}
                    placeholder="Pages (12-15)"
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Tags */}
            <CollapsibleSection
              id="tags"
              label="Tags"
              icon={Tag}
              isOpen={state.openSections.tags}
              onToggle={actions.toggleSection}
              summary={state.tags ? state.tags.split(',').length + ' tags' : 'None'}
            >
              <Input
                value={state.tags}
                onChange={e => actions.setTags(e.target.value)}
                placeholder="Tags: topology, calculus, …"
                fullWidth
                rightAction={
                  <Button
                    variant="ghost"
                    size="sm"
                    onMouseDown={e => e.preventDefault()}
                    onClick={actions.handleAISuggestTags}
                    disabled={state.aiLoading === 'tags'}
                    icon={<Sparkles size={14} color={theme.colors.accent} />}
                    style={{ padding: 4, height: 28, width: 28, minWidth: 'auto' }}
                  />
                }
              />
              {state.aiTagSuggestions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Suggested:</span>
                  {state.aiTagSuggestions.map(t => (
                    <Badge key={t} onClick={() => actions.acceptTag(t)} style={{ cursor: 'pointer' }}>
                      +{t}
                    </Badge>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              id="relations"
              label="Relations"
              icon={Link2}
              isOpen={state.openSections.relations}
              onToggle={actions.toggleSection}
              summary={state.refs.length + ' links'}
            >
              {/* Search Bar Row with AI Suggest Inside */}
              <div style={{ 
                display: 'flex', 
                gap: 10, 
                position: 'relative', 
                marginBottom: 12, 
                alignItems: 'center', 
                zIndex: 200 // Higher than backdrop (150)
              }}>
                <div ref={refs.searchContainerRef} style={{ flex: 1, position: 'relative' }}>
                  <div style={{ position: 'relative', zIndex: 100, flex: 1 }}>
                    <Input
                      value={state.refSearch}
                      onChange={e => {
                        actions.setRefSearch(e.target.value)
                        actions.setIsRefSearchOpen(true)
                      }}
                      onFocus={() => actions.setIsRefSearchOpen(true)}
                      placeholder="Search entries to link..."
                      fullWidth
                      rightAction={
                        <Button
                          variant="ghost"
                          size="sm"
                          onMouseDown={e => e.preventDefault()}
                          onClick={actions.handleAISuggestRefs}
                          disabled={state.aiLoading === 'refs'}
                          icon={<Sparkles size={14} color={theme.colors.accent} />}
                          style={{ padding: 4, height: 28, width: 28, minWidth: 'auto' }}
                        />
                      }
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {state.isRefSearchOpen && (
                    <>
                      <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 150 }}
                        onClick={() => actions.setIsRefSearchOpen(false)}
                      />
                      <div style={{
                        position: 'absolute',
                        left: 0, right: 0,
                        zIndex: 300,
                        maxHeight: 250,
                        overflowY: 'auto',
                        background: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: 8,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                        ...(state.dropdownPosition === 'top'
                          ? { bottom: '100%', marginBottom: 8 }
                          : { top: '100%', marginTop: 4 })
                      }}>
                        {allEntries
                          .filter(e => e.id !== initial?.id && !state.refs.includes(e.id))
                          .filter(e => e.title.toLowerCase().includes(state.refSearch.toLowerCase()))
                          .map(e => (
                            <div
                              key={e.id}
                              onClick={() => {
                                actions.toggleRef(e.id)
                                actions.setRefRelations(prev => ({ ...prev, [e.id]: state.activeRelType }))
                                actions.setRefSearch('')
                                actions.setIsRefSearchOpen(false)
                              }}
                              style={{
                                padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${theme.colors.border}`,
                                transition: theme.animations.fast, display: 'flex', alignItems: 'center', gap: 10
                              }}
                              onMouseEnter={ev => ev.currentTarget.style.background = theme.colors.surfaceHover}
                              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                            >
                              <Badge variant="outline" color={TYPE_COLORS[e.type]}>{e.type.slice(0, 3)}</Badge>
                              <span style={{ fontSize: '0.9rem', color: theme.colors.text }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                            </div>
                          ))}
                        {allEntries.filter(e => e.id !== initial?.id && !state.refs.includes(e.id) && e.title.toLowerCase().includes(state.refSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: theme.colors.textMuted }}>No matches found</div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ width: 140 }}>
                  <Select
                    value={state.activeRelType}
                    onChange={e => actions.setActiveRelType(e.target.value)}
                    options={RELATION_TYPES.map(rt => ({ value: rt, label: rt.replace(/_/g, ' ') }))}
                  />
                </div>
              </div>

              {/* Active Relations: Connected Tree List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 220,
                overflowY: 'auto',
                padding: '4px 0 4px 16px',
                position: 'relative',
                borderLeft: `1px solid ${theme.colors.border}`
              }}>
                {state.refs.map((refId, idx) => {
                  const entry = allEntries.find(e => e.id === refId)
                  if (!entry) return null
                  const isSuggested = state.aiRefSuggestions.includes(refId)

                  return (
                    <div key={refId} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      position: 'relative',
                      borderBottom: idx === state.refs.length - 1 ? 'none' : `1px solid ${theme.colors.border}44`,
                      transition: theme.animations.fast,
                      borderRadius: '0 8px 8px 0',
                      marginLeft: -1 // overlap with tree line
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.colors.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Horizontal Connector Line */}
                      <div style={{
                        position: 'absolute',
                        left: -16,
                        width: 16,
                        height: 1,
                        background: theme.colors.border,
                        top: '50%'
                      }} />

                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', background: theme.colors.surface,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1px solid ${theme.colors.border}`, fontSize: '0.7rem'
                        }}>
                          <Badge variant="solid" color={isSuggested ? theme.colors.success : theme.colors.accent} style={{ padding: 0, minWidth: 'auto', background: 'transparent' }}>
                            {isSuggested ? '✦' : '•'}
                          </Badge>
                        </div>
                        <span
                          style={{ fontSize: '0.85rem', color: theme.colors.textDim, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          dangerouslySetInnerHTML={{ __html: renderTitle(entry.title) }}
                        />
                      </div>

                      <div style={{ width: 130 }}>
                        <Select
                          value={state.refRelations[refId] || 'related_to'}
                          onChange={ev => actions.setRefRelations(prev => ({ ...prev, [refId]: ev.target.value }))}
                          options={RELATION_TYPES.map(rt => ({ value: rt, label: rt.replace(/_/g, ' ') }))}
                          style={{ fontSize: '0.75rem', height: 28, padding: '0 8px', background: 'transparent', border: 'none' }}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => actions.toggleRef(refId)}
                        style={{ padding: 4, height: 26, width: 26, opacity: 0.6 }}
                        icon={<X size={14} />}
                      />
                    </div>
                  )
                })}

                {state.refs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: theme.colors.textMuted, fontSize: '0.8rem', fontStyle: 'italic' }}>
                    No active relations yet.
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: theme.colors.surface
        }}>
          {actions.onDelete ? (
            <Button
              variant="danger"
              onClick={actions.onDelete}
              icon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
            {initial?.id && (
              <Input
                value={state.versionNote}
                onChange={e => actions.setVersionNote(e.target.value)}
                placeholder="Commit message (optional)…"
                style={{ width: 220 }}
              />
            )}
            <Button variant="outline" onClick={actions.onCancel} icon={<X size={16} />}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={actions.handleSave}
              disabled={state.saving}
              icon={<Save size={16} />}
            >
              {state.saving ? 'Saving…' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── DRAG HANDLE ── */}
      <div
        onMouseDown={actions.startResizing}
        style={{
          width: 4, cursor: 'col-resize', zIndex: 110,
          background: theme.colors.border,
          transition: theme.animations.fast,
          margin: '0 -2px', position: 'relative'
        }}
        onMouseEnter={e => e.currentTarget.style.background = theme.colors.accent}
        onMouseLeave={e => e.currentTarget.style.background = theme.colors.border}
      />

      {/* ── RIGHT: Live Preview ── */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: theme.colors.background,
        zIndex: 1,
        position: 'relative'
      }}>
        <div style={{
          padding: '14px 24px',
          borderBottom: `1px solid ${theme.colors.border}`,
          fontSize: '0.7rem',
          color: theme.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          fontWeight: 700
        }}>
          Live Preview
        </div>
        <div style={{ 
          flex: 1, 
          overflowX: 'hidden', 
          overflowY: 'auto', 
          padding: '32px 24px',
          width: '100%',
          maxWidth: 'none'
        }}>
          <Badge variant="solid" color={TYPE_COLORS[state.type]} style={{ marginBottom: 16 }}>
            {state.type}
          </Badge>

          <h2 style={{
            fontFamily: theme.typography.serif,
            fontSize: '2.4rem',
            marginBottom: 24,
            lineHeight: 1.1,
            color: theme.colors.accent,
            overflowWrap: 'break-word',
            wordBreak: 'break-word'
          }}>
            <span dangerouslySetInnerHTML={{ __html: renderTitle(state.title) || '<span style="opacity:0.3">Untitled Archive</span>' }} />
          </h2>
          <MathRenderer content={state.content} />

          {state.tags && (
            <div style={{ marginTop: 40, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {state.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} style={{
                  fontFamily: theme.typography.sans,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textMuted,
                  background: theme.colors.surface
                }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
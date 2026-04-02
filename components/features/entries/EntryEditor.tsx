'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Entry, SourceOption, EntryOption, Relation } from '@/types'
import { Trash2, Sparkles, X, Save, AlertTriangle, ChevronDown, ChevronUp, Link2, Tag, FileText } from 'lucide-react'
import { theme } from '@/lib/core/theme'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { renderTitle } from '@/lib/core/math'
import { MathRenderer } from '@/lib/core/MathRenderer'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface DuplicateEntry {
  id: number
  title: string
  type: string
  score: number
}

interface Props {
  initial?: Partial<Entry>
  allEntries?: EntryOption[]
  sources?: SourceOption[]
  initialRelations?: Relation[]
  onSave: (entry: Partial<Entry>, versionNote?: string) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

const ENTRY_TYPES = ['definition', 'theorem', 'lemma', 'corollary', 'example', 'remark']
const RELATION_TYPES = ['uses', 'example_of', 'generalizes', 'proof_depends_on', 'related_to', 'contrasts_with']

const TYPE_COLORS: Record<string, string> = {
  definition: '#6b8fcc',
  theorem: '#c96b6b',
  lemma: '#8fcc8f',
  corollary: '#cc6ba8',
  example: '#cc9f6b',
  remark: '#a06bcc'
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
      onMouseEnter={e => e.currentTarget.style.background = '#ffffff05'}
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

export default function EntryEditor({ initial, allEntries = [], sources = [], initialRelations = [], onSave, onCancel, onDelete }: Props) {
  const [type, setType] = useState(initial?.type || 'definition')
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '')
  const [refs, setRefs] = useState<number[]>(() => {
    const fromInitial = initial?.refs || []
    const fromRelations = initialRelations?.map(r => r.toEntryId) || []
    return Array.from(new Set([...fromInitial, ...fromRelations]))
  })
  const [aiLoading, setAiLoading] = useState<'tags' | 'refs' | null>(null)
  const [aiTagSuggestions, setAiTagSuggestions] = useState<string[]>([])
  const [aiRefSuggestions, setAiRefSuggestions] = useState<number[]>([])
  const [versionNote, setVersionNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Source fields
  const [sourceId, setSourceId] = useState<number | null>(initial?.sourceId || null)
  const [pageRange, setPageRange] = useState(initial?.pageRange || '')

  // Relation types per reference
  const [refRelations, setRefRelations] = useState<Record<number, string>>(() => {
    const initialMap: Record<number, string> = {}
    if (initialRelations && initialRelations.length > 0) {
      initialRelations.forEach(r => {
        initialMap[r.toEntryId] = r.relationType
      })
    }
    return initialMap
  })

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([])
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const duplicateTimerRef = useRef<any>(null)

  // Panel sizing
  const [leftWidth, setLeftWidth] = useState(50)

  // Relations UI state
  const [refSearch, setRefSearch] = useState('')
  const [activeRelType, setActiveRelType] = useState('uses')
  const [isRefSearchOpen, setIsRefSearchOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom')
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sources: false,
    tags: false,
    relations: true
  })

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const previewRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)

  // Duplicate detection on title/content change
  useEffect(() => {
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current)
    if (!title.trim() && !content.trim()) { setDuplicates([]); return }

    duplicateTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content: content.slice(0, 500), excludeId: initial?.id })
        })
        const data = await res.json()
        setDuplicates(data.duplicates || [])
        setShowDuplicateWarning((data.duplicates || []).length > 0)
      } catch { setDuplicates([]) }
    }, 1500)

    return () => { if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current) }
  }, [title, content, initial?.id])

  const handleAISuggestTags = async () => {
    setAiLoading('tags')
    try {
      const res = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      const data = await res.json()
      setAiTagSuggestions(data.tags || [])
    } catch (e) { console.error(e) }
    finally { setAiLoading(null) }
  }

  const handleAISuggestRefs = async () => {
    setAiLoading('refs')
    try {
      const res = await fetch('/api/ai/suggest-refs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, currentId: initial?.id })
      })
      const data = await res.json()
      setAiRefSuggestions(data.refs || [])
    } catch (e) { console.error(e) }
    finally { setAiLoading(null) }
  }

  const acceptTag = (tag: string) => {
    const current = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (!current.includes(tag)) setTags([...current, tag].join(', '))
    setAiTagSuggestions(prev => prev.filter(t => t !== tag))
  }

  const acceptRef = (id: number) => {
    if (!refs.includes(id)) setRefs(prev => [...prev, id])
    setAiRefSuggestions(prev => prev.filter(r => r !== id))
  }

  const toggleRef = (id: number) => {
    setRefs(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  // Handle smart dropdown positioning relative to the scrollable pane
  useEffect(() => {
    if (isRefSearchOpen && searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      // If less than 280px below, and more space above, flip it
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setDropdownPosition('top')
      } else {
        setDropdownPosition('bottom')
      }
    }
  }, [isRefSearchOpen])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(
        {
          id: initial?.id,
          type,
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          refs,
          sourceId: sourceId || null,
          pageRange,
        },
        versionNote || undefined
      )

      if (initial?.id) {
        for (const refId of refs) {
          const relType = refRelations[refId] || 'related_to'

          // Only save if it's new OR the type has changed
          const existingRel = initialRelations?.find(r => r.toEntryId === refId)
          if (existingRel && existingRel.relationType === relType) {
            continue
          }

          try {
            await fetch('/api/relations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fromEntryId: initial.id,
                toEntryId: refId,
                relationType: relType,
              })
            })
          } catch { /* ignore relation save failures */ }
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    const startX = mouseDownEvent.clientX
    const startWidth = leftWidth

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const deltaX = mouseMoveEvent.clientX - startX
      const newWidth = startWidth + (deltaX / window.innerWidth) * 100
      setLeftWidth(Math.max(5, Math.min(95, newWidth)))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'default'
    }

    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [leftWidth])

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      fontFamily: theme.typography.sans,
      background: theme.colors.background
    }}>

      {/* ── LEFT: Edit Panel ── */}
      <div style={{
        width: `${leftWidth}%`,
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
              value={type}
              onChange={e => setType(e.target.value)}
              options={ENTRY_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            />
          </div>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Entry title…"
            style={{ flex: 1, fontSize: '1.2rem', fontFamily: theme.typography.serif }}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Duplicate Warning */}
          {showDuplicateWarning && duplicates.length > 0 && (
            <div style={{
              margin: '8px 20px',
              padding: '10px 12px',
              background: theme.colors.dangerMuted,
              border: `1px solid ${theme.colors.danger}44`,
              borderRadius: 8,
              minHeight: 'fit-content'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={14} color={theme.colors.danger} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: theme.colors.danger, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Possible Duplicates
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDuplicateWarning(false)}
                  icon={<X size={14} />}
                  style={{ marginLeft: 'auto', padding: 2, height: 20, width: 20 }}
                />
              </div>
              {duplicates.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                  <Badge variant="solid" color={TYPE_COLORS[d.type]} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                    {d.type.slice(0, 3)}
                  </Badge>
                  <span style={{ fontFamily: theme.typography.serif, fontSize: '0.9rem', color: theme.colors.text, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    dangerouslySetInnerHTML={{ __html: renderTitle(d.title) }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: theme.colors.accent }}>
                    {Math.round(d.score * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Monaco Editor Container - Stretches to fill gap */}
          <div ref={editorContainerRef} style={{ 
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
              value={content}
              onChange={v => setContent(v || '')}
              theme="vs-dark"
              onMount={(editor) => {
                editorRef.current = editor
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
              isOpen={openSections.sources}
              onToggle={toggleSection}
              summary={sourceId ? (sources.find(s => s.id === sourceId)?.title || 'Selected') + (pageRange ? ` (p.${pageRange})` : '') : 'None'}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    value={sourceId || ''}
                    onChange={e => setSourceId(e.target.value ? parseInt(e.target.value) : null)}
                    options={[
                      { value: '', label: 'No source' },
                      ...sources.map(s => ({ value: s.id, label: `${s.title} (${s.sourceType})` }))
                    ]}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <Input
                    value={pageRange}
                    onChange={e => setPageRange(e.target.value)}
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
              isOpen={openSections.tags}
              onToggle={toggleSection}
              summary={tags ? tags.split(',').length + ' tags' : 'None'}
            >
              <Input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="Tags: topology, calculus, …"
                fullWidth
                rightAction={
                  <Button
                    variant="ghost"
                    size="sm"
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleAISuggestTags}
                    disabled={aiLoading === 'tags'}
                    icon={<Sparkles size={14} color={theme.colors.accent} />}
                    style={{ padding: 4, height: 28, width: 28, minWidth: 'auto' }}
                  />
                }
              />
              {aiTagSuggestions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Suggested:</span>
                  {aiTagSuggestions.map(t => (
                    <Badge key={t} onClick={() => acceptTag(t)} style={{ cursor: 'pointer' }}>
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
              isOpen={openSections.relations}
              onToggle={toggleSection}
              summary={refs.length + ' links'}
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
                <div ref={searchContainerRef} style={{ flex: 1, position: 'relative' }}>
                  <div style={{ position: 'relative', zIndex: 100, flex: 1 }}>
                    <Input
                      value={refSearch}
                      onChange={e => {
                        setRefSearch(e.target.value)
                        setIsRefSearchOpen(true)
                      }}
                      onFocus={() => setIsRefSearchOpen(true)}
                      placeholder="Search entries to link..."
                      fullWidth
                      rightAction={
                        <Button
                          variant="ghost"
                          size="sm"
                          onMouseDown={e => e.preventDefault()}
                          onClick={handleAISuggestRefs}
                          disabled={aiLoading === 'refs'}
                          icon={<Sparkles size={14} color={theme.colors.accent} />}
                          style={{ padding: 4, height: 28, width: 28, minWidth: 'auto' }}
                        />
                      }
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {isRefSearchOpen && (
                    <>
                      <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 150 }}
                        onClick={() => setIsRefSearchOpen(false)}
                      />
                      <div style={{
                        position: 'absolute',
                        left: 0, right: 0,
                        zIndex: 1000,
                        maxHeight: 250,
                        overflowY: 'auto',
                        background: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: 8,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                        ...(dropdownPosition === 'top'
                          ? { bottom: '100%', marginBottom: 8 }
                          : { top: '100%', marginTop: 4 })
                      }}>
                        {allEntries
                          .filter(e => e.id !== initial?.id && !refs.includes(e.id))
                          .filter(e => e.title.toLowerCase().includes(refSearch.toLowerCase()))
                          .map(e => (
                            <div
                              key={e.id}
                              onClick={() => {
                                toggleRef(e.id)
                                setRefRelations(prev => ({ ...prev, [e.id]: activeRelType }))
                                setRefSearch('')
                                setIsRefSearchOpen(false)
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
                        {allEntries.filter(e => e.id !== initial?.id && !refs.includes(e.id) && e.title.toLowerCase().includes(refSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: theme.colors.textMuted }}>No matches found</div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ width: 140 }}>
                  <Select
                    value={activeRelType}
                    onChange={e => setActiveRelType(e.target.value)}
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
                {refs.map((refId, idx) => {
                  const entry = allEntries.find(e => e.id === refId)
                  if (!entry) return null
                  const isSuggested = aiRefSuggestions.includes(refId)

                  return (
                    <div key={refId} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      position: 'relative',
                      borderBottom: idx === refs.length - 1 ? 'none' : `1px solid ${theme.colors.border}44`,
                      transition: theme.animations.fast,
                      borderRadius: '0 8px 8px 0',
                      marginLeft: -1 // overlap with tree line
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffffff05'}
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
                          value={refRelations[refId] || 'related_to'}
                          onChange={ev => setRefRelations(prev => ({ ...prev, [refId]: ev.target.value }))}
                          options={RELATION_TYPES.map(rt => ({ value: rt, label: rt.replace(/_/g, ' ') }))}
                          style={{ fontSize: '0.75rem', height: 28, padding: '0 8px', background: 'transparent', border: 'none' }}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRef(refId)}
                        style={{ padding: 4, height: 26, width: 26, opacity: 0.6 }}
                        icon={<X size={14} />}
                      />
                    </div>
                  )
                })}

                {refs.length === 0 && (
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
          {onDelete ? (
            <Button
              variant="danger"
              onClick={onDelete}
              icon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
            {initial?.id && (
              <Input
                value={versionNote}
                onChange={e => setVersionNote(e.target.value)}
                placeholder="Commit message (optional)…"
                style={{ width: 220 }}
              />
            )}
            <Button variant="outline" onClick={onCancel} icon={<X size={16} />}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={handleSave}
              disabled={saving}
              icon={<Save size={16} />}
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── DRAG HANDLE ── */}
      <div
        onMouseDown={startResizing}
        style={{
          width: 4, cursor: 'col-resize', zIndex: 50,
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
        minWidth: 0, // Truly flexible
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
          <Badge variant="solid" color={TYPE_COLORS[type]} style={{ marginBottom: 16 }}>
            {type}
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
            <span dangerouslySetInnerHTML={{ __html: renderTitle(title) || '<span style="opacity:0.3">Untitled Archive</span>' }} />
          </h2>
          <MathRenderer content={content} />

          {tags && (
            <div style={{ marginTop: 40, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
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
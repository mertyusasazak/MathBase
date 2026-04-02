// app/components/EntryEditor.tsx
// Resizable Panel + Live Preview + Source + Relations + Duplicate Detection

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { renderTitle } from '@/lib/core/math'
import { Entry, SourceOption, EntryOption } from '@/types'
import { Trash2, Sparkles, X, Save, AlertTriangle } from 'lucide-react'

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
  onSave: (entry: Partial<Entry>, versionNote?: string) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

const ENTRY_TYPES = ['definition', 'theorem', 'lemma', 'corollary', 'example', 'remark']
const RELATION_TYPES = ['uses', 'example_of', 'generalizes', 'proof_depends_on', 'related_to', 'contrasts_with']

export default function EntryEditor({ initial, allEntries = [], sources = [], onSave, onCancel, onDelete }: Props) {
  const [type, setType] = useState(initial?.type || 'definition')
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '')
  const [refs, setRefs] = useState<number[]>(initial?.refs || [])
  const [aiLoading, setAiLoading] = useState<'tags' | 'refs' | null>(null)
  const [aiTagSuggestions, setAiTagSuggestions] = useState<string[]>([])
  const [aiRefSuggestions, setAiRefSuggestions] = useState<number[]>([])
  const [versionNote, setVersionNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Source fields
  const [sourceId, setSourceId] = useState<number | null>(initial?.sourceId || null)
  const [pageRange, setPageRange] = useState(initial?.pageRange || '')

  // Relation types per reference
  const [refRelations, setRefRelations] = useState<Record<number, string>>({})

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([])
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const duplicateTimerRef = useRef<any>(null)

  // Panel sizing
  const [leftWidth, setLeftWidth] = useState(50)

  const previewRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)
  const [editorHeight, setEditorHeight] = useState(400)

  useEffect(() => {
    if (!previewRef.current) return
    import('katex').then(katex => {
      if (!previewRef.current) return
      let html = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
      html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
        try { return katex.default.renderToString(math.trim(), { displayMode: true, throwOnError: false }) }
        catch { return `$$${math}$$` }
      })
      html = html.replace(/\$((?:[^$]|\\.)*?)\$/g, (_, math) => {
        try { return katex.default.renderToString(math.trim(), { displayMode: false, throwOnError: false }) }
        catch { return `$${math}$` }
      })
      html = html.split('\n\n').map(p => `<p style="margin-bottom:1em">${p}</p>`).join('')
      previewRef.current!.innerHTML = html
    })
  }, [content])

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

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save the entry
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

      // Save relations for refs
      if (initial?.id || true) {
        for (const refId of refs) {
          const relType = refRelations[refId] || 'related_to'
          try {
            await fetch('/api/relations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fromEntryId: initial?.id || 0, // Will be set by API on new entries
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
      setLeftWidth(Math.max(40, Math.min(60, newWidth)))
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
      height: '100%',
      fontFamily: 'var(--font-sans)'
    }}>

      {/* ── LEFT: Edit Panel ── */}
      <div style={{
        width: `${leftWidth}%`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a33', display: 'flex', gap: 12, alignItems: 'center' }}>
          <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
            {ENTRY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <input
            value={title} onChange={e => setTitle(e.target.value)} placeholder="Entry title…"
            style={{ ...inputStyle, flex: 1, fontSize: '1rem', fontFamily: 'EB Garamond, serif' }}
          />
        </div>

        {/* Duplicate Warning */}
        {showDuplicateWarning && duplicates.length > 0 && (
          <div style={{
            margin: '0 20px', padding: '10px 14px', background: 'rgba(201, 168, 76, 0.1)',
            border: '1px solid rgba(201, 168, 76, 0.3)', borderRadius: 6, marginTop: 8, marginBottom: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={14} color="#c9a84c" />
              <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.75rem', fontWeight: 600, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Possible Duplicates Detected
              </span>
              <button onClick={() => setShowDuplicateWarning(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#7a7870', cursor: 'pointer', padding: 0 }}>
                <X size={14} />
              </button>
            </div>
            {duplicates.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', background: TYPE_COLORS[d.type] + '22', color: TYPE_COLORS[d.type] }}>
                  {d.type.slice(0, 3)}
                </span>
                <span style={{ fontFamily: 'EB Garamond, serif', fontSize: '0.9rem', color: '#e8e6df', flex: 1 }}
                  dangerouslySetInnerHTML={{ __html: renderTitle(d.title) }} />
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.7rem', color: '#c9a84c' }}>
                  {Math.round(d.score * 100)}% similar
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Monaco Editor */}
        <div ref={editorContainerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <MonacoEditor
            height={editorHeight}
            defaultLanguage="markdown"
            value={content}
            onChange={v => setContent(v || '')}
            theme="vs-dark"
            onMount={(editor) => {
              editorRef.current = editor
              const updateHeight = () => {
                if (editorContainerRef.current) setEditorHeight(editorContainerRef.current.clientHeight)
              }
              updateHeight()
              window.addEventListener('resize', updateHeight)
            }}
            options={{
              fontSize: 14, fontFamily: 'Courier New, monospace', lineNumbers: 'off',
              minimap: { enabled: false }, wordWrap: 'on', scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 }, quickSuggestions: false,
              fontLigatures: false, disableLayerHinting: true, automaticLayout: true
            }}
          />
        </div>

        {/* Source Selection */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #2a2a33' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Source</span>
            <select
              value={sourceId || ''}
              onChange={e => setSourceId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ ...inputStyle, flex: 1, fontSize: '0.82rem' }}
            >
              <option value="">No source</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.title} ({s.sourceType})</option>
              ))}
            </select>
            <input
              value={pageRange}
              onChange={e => setPageRange(e.target.value)}
              placeholder="Pages (e.g. 12-15)"
              style={{ ...inputStyle, width: 120, fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #2a2a33' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags: analysis, topology, …"
              style={{ ...inputStyle, flex: 1, fontSize: '0.82rem' }}
            />
            <button onClick={handleAISuggestTags} disabled={aiLoading === 'tags'} className="btn-base btn-green" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
              {aiLoading === 'tags' ? '…' : <><Sparkles size={14} /> AI Tags</>}
            </button>
          </div>
          {aiTagSuggestions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#7a7870', alignSelf: 'center' }}>Suggested:</span>
              {aiTagSuggestions.map(t => <button key={t} onClick={() => acceptTag(t)} style={chipStyle}>+{t}</button>)}
            </div>
          )}
        </div>

        {/* Refs with Relation Types */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #2a2a33' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cross-References & Relations</span>
            <button onClick={handleAISuggestRefs} disabled={aiLoading === 'refs'} className="btn-base btn-green" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
              {aiLoading === 'refs' ? '…' : <><Sparkles size={14} /> AI Refs</>}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 120, overflowY: 'auto' }}>
            {allEntries.filter(e => e.id !== initial?.id).map(e => {
              const isSelected = refs.includes(e.id)
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    onClick={() => toggleRef(e.id)}
                    style={{
                      ...chipStyle,
                      background: isSelected ? 'rgba(201,168,76,0.2)' : aiRefSuggestions.includes(e.id) ? 'rgba(126,184,176,0.15)' : 'transparent',
                      borderColor: isSelected ? '#c9a84c' : aiRefSuggestions.includes(e.id) ? '#7eb8b0' : '#2a2a33',
                      color: isSelected ? '#c9a84c' : '#7a7870',
                    }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderTitle(e.title.length > 22 ? e.title.slice(0, 20) + '…' : e.title) }} />
                    {aiRefSuggestions.includes(e.id) && <span style={{ color: '#7eb8b0', marginLeft: 4 }}>✦</span>}
                  </button>
                  {isSelected && (
                    <select
                      value={refRelations[e.id] || 'related_to'}
                      onChange={ev => setRefRelations(prev => ({ ...prev, [e.id]: ev.target.value }))}
                      style={{ ...inputStyle, fontSize: '0.65rem', padding: '2px 4px', width: 90, background: '#1e1e24' }}
                    >
                      {RELATION_TYPES.map(rt => (
                        <option key={rt} value={rt}>{rt.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #2a2a33', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between'
        }}>
          {onDelete ? (
            <button
              onClick={onDelete}
              className="btn-base btn-red"
              style={{ paddingLeft: 14, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
            {initial?.id && (
              <input
                value={versionNote} onChange={e => setVersionNote(e.target.value)} placeholder="Version note (optional)…"
                style={{ ...inputStyle, width: 180, fontSize: '0.8rem' }}
              />
            )}
            <button onClick={onCancel} className="btn-base btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={16} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-base btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>

      {/* ── DRAG HANDLE ── */}
      <div
        onMouseDown={startResizing}
        style={{
          width: 6, cursor: 'col-resize', zIndex: 50,
          background: '#2a2a33', transition: 'background 0.2s',
          margin: '0 -3px', position: 'relative'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#c9a84c'}
        onMouseLeave={e => e.currentTarget.style.background = '#2a2a33'}
      />

      {/* ── RIGHT: Live Preview ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: '#0e0e10',
      }}>
        <div style={{
          padding: '10px 20px', borderBottom: '1px solid #2a2a33', fontSize: '0.72rem',
          color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.1em'
        }}>
          Live Preview
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          <div style={{
            display: 'inline-block', background: `rgba(${typeColorRGB(type)},0.1)`,
            color: typeColor(type), fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.7rem',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '3px 8px', borderRadius: 4, marginBottom: 10
          }}>
            {type}
          </div>
          <h2 style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.7rem', marginBottom: 20, lineHeight: 1.2 }}>
            <span dangerouslySetInnerHTML={{ __html: renderTitle(title) || '<span style="color:#7a7870">Untitled</span>' }} />
          </h2>

          <div
            ref={previewRef}
            style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.05rem', lineHeight: 1.8, color: '#ccc8c0' }}
          />
          {tags && (
            <div style={{ marginTop: 24, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} style={{
                  fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.72rem',
                  padding: '3px 9px', borderRadius: 20, border: '1px solid #2a2a33', color: '#7a7870'
                }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Style helpers
const inputStyle: React.CSSProperties = { background: '#1e1e24', border: '1px solid #2a2a33', borderRadius: 6, color: '#e8e6df', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.85rem', padding: '7px 10px', outline: 'none' }
const chipStyle: React.CSSProperties = { fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4, border: '1px solid #2a2a33', background: 'transparent', color: '#7a7870', cursor: 'pointer', transition: 'all 0.15s' }
const TYPE_COLORS: Record<string, string> = { definition: '#6b8fcc', theorem: '#c96b6b', lemma: '#8fcc8f', corollary: '#cc6ba8', example: '#cc9f6b', remark: '#a06bcc' }
const TYPE_RGB: Record<string, string> = { definition: '107,143,204', theorem: '201,107,107', lemma: '143,204,143', corollary: '204,107,168', example: '204,159,107', remark: '160,107,204' }
const typeColor = (t: string) => TYPE_COLORS[t] || '#c9a84c'
const typeColorRGB = (t: string) => TYPE_RGB[t] || '201,168,76'
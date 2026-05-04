'use client'

import React, { useState } from 'react'
import {
  FileText, CheckCircle2, Loader2, Save,
  Trash2, Sparkles, ArrowUp, FileJson, Pencil, X, Eye, Code
} from 'lucide-react'
import { Button, Badge, Select } from '@/components/ui/Common'
import Pagination from '@/components/ui/Pagination'
import { DataTable, Column } from '@/components/ui/DataTable'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const totalPages = Math.max(1, Math.ceil(candidates.length / itemsPerPage))
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [jsonRestoreData, setJsonRestoreData] = useState<any>(null)
  const requestIdRef = React.useRef<number>(0)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const { actions } = useAppContext()

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 300)
  }

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)

    const formData = new FormData()
    formData.append('file', selectedFile)

    const currentRequestId = ++requestIdRef.current
    setLoading(true)
    try {
      const res = await fetch('/api/import/pdf', { method: 'POST', body: formData })
      
      // If user cancelled, don't even check res.ok
      if (currentRequestId !== requestIdRef.current) return

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
      // Only alert if the request wasn't cancelled by the user
      if (currentRequestId === requestIdRef.current) {
        console.error(err)
        alert('Failed to extract data from PDF. Please ensure PyMuPDF is installed and the PDF is readable.')
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        setJsonRestoreData(json)
      } catch (err) {
        alert('Invalid JSON file.')
      }
    }
    reader.readAsText(selectedFile)
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
          pageRange: `1-${candidates.length > 0 ? Math.max(...candidates.map((x: any) => parseInt(x.pageRange) || 0)) : 1}`
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
    // Invalidate current request
    requestIdRef.current++
    
    if (loading) {
      setLoading(false)
      setFile(null)
      return
    }

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
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: 'var(--bg)', zIndex: 10 }}>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="custom-scrollbar"
        style={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          position: 'relative',
          transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          paddingRight: editingCandidateId ? 450 : 0
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: 'var(--bg)',
            padding: '32px 48px 24px',
            borderBottom: (candidates.length > 0 || jsonRestoreData || loading) ? `1px solid ${theme.colors.border}` : 'none',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 16 }}>
                <span style={{ color: theme.colors.textMuted, fontSize: '0.9rem' }}>
                  {selectedIds.size} of {candidates.length} selected
                </span>
              </div>
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
            {(candidates.length > 0 || file || jsonRestoreData || loading) && (
              <Button
                variant="gold"
                onClick={handleCancel}
                style={{ height: 44, padding: '0 20px' }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div style={{ padding: '40px 48px 100px' }}>
          {/* DROPZONE OR CONTENT */}
          {candidates.length === 0 && !loading && !jsonRestoreData ? (
            <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>
              {/* PDF Import Card */}
              <label
                htmlFor="upload-pdf"
                style={{
                  flex: 1,
                  border: `2px dashed ${theme.colors.border}`,
                  borderRadius: 28,
                  padding: '48px 36px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                  cursor: 'pointer',
                  background: `${theme.colors.surface}33`,
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = theme.colors.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = theme.colors.border)}
              >
                <div style={{ width: 72, height: 72, borderRadius: 20, background: `${theme.colors.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={36} color={theme.colors.accent} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: theme.colors.text, margin: '0 0 6px' }}>Import PDF</h2>
                  <p style={{ color: theme.colors.textMuted, margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Extract definitions, theorems, lemmas and examples from a mathematical PDF.
                  </p>
                </div>
                <div style={{
                  marginTop: 8,
                  background: theme.colors.accent,
                  color: theme.colors.onAccent || '#000',
                  padding: '10px 28px',
                  borderRadius: 10,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                }}>
                  Upload PDF
                </div>
                <p style={{ color: theme.colors.textMuted, fontSize: '0.75rem', margin: 0 }}>or drag &amp; drop a .pdf file</p>
                <input id="upload-pdf" type="file" accept=".pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
              </label>

              {/* Divider */}
              <div style={{ width: 1, background: theme.colors.border, flexShrink: 0, alignSelf: 'stretch' }} />

              {/* JSON Restore Card */}
              <label
                htmlFor="upload-json"
                style={{
                  flex: 1,
                  border: `2px dashed ${theme.colors.border}`,
                  borderRadius: 28,
                  padding: '48px 36px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                  cursor: 'pointer',
                  background: `${theme.colors.surface}33`,
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = theme.colors.textMuted)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = theme.colors.border)}
              >
                <div style={{ width: 72, height: 72, borderRadius: 20, background: `${theme.colors.surface}`, border: `1px solid ${theme.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileJson size={36} color={theme.colors.textMuted} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: theme.colors.text, margin: '0 0 6px' }}>Restore Backup</h2>
                  <p style={{ color: theme.colors.textMuted, margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Merge or replace your library from a previously exported JSON backup file.
                  </p>
                </div>
                <div style={{
                  marginTop: 8,
                  background: 'transparent',
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textMuted,
                  padding: '10px 28px',
                  borderRadius: 10,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}>
                  Upload JSON
                </div>
                <p style={{ color: theme.colors.textMuted, fontSize: '0.75rem', margin: 0 }}>or drag &amp; drop a .json file</p>
                <input id="upload-json" type="file" accept=".json" onChange={handleJsonUpload} style={{ display: 'none' }} />
              </label>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <DataTable
                columns={[
                  {
                    id: 'type',
                    label: 'Type',
                    width: 110,
                    render: (c) => (
                      <span style={{
                        background: `${TYPE_COLORS[c.type] || theme.colors.accent}22`,
                        color: TYPE_COLORS[c.type] || theme.colors.accent,
                        padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        {c.type}
                      </span>
                    )
                  },
                  {
                    id: 'title',
                    label: 'Title',
                    width: '25%',
                    render: (c) => (
                      <div style={{ fontWeight: 600, color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                        {c.title}
                      </div>
                    )
                  },
                  {
                    id: 'content',
                    label: 'Content Preview',
                    render: (c) => (
                      <div style={{
                        color: theme.colors.textMuted, fontSize: '0.9rem',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', lineHeight: 1.5, maxHeight: '3em'
                      }}>
                        {c.content.replace(/[\n\r]+/g, ' ')}
                      </div>
                    )
                  },
                  {
                    id: 'tags',
                    label: 'Tags',
                    width: 150,
                    render: (c) => (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.tags.slice(0, 2).map((t, i) => (
                          <Badge key={i} variant="muted" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{t}</Badge>
                        ))}
                        {c.tags.length > 2 && (
                          <div style={{ position: 'relative', display: 'flex' }} className="more-tags-trigger">
                            <span
                              style={{ fontSize: '0.65rem', color: theme.colors.textMuted, alignSelf: 'center', padding: '2px 4px', cursor: 'help' }}
                            >
                              +{c.tags.length - 2} more
                            </span>
                            <div className="more-tags-tooltip" style={{
                              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                              background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
                              padding: '8px', borderRadius: 6, boxShadow: theme.shadows.lg,
                              zIndex: 100, display: 'none', gap: 4, flexWrap: 'wrap', width: 'max-content', maxWidth: 200,
                              marginBottom: 8
                            }}>
                              {c.tags.slice(2).map((t, i) => <Badge key={i} variant="muted" style={{ fontSize: '0.6rem' }}>{t}</Badge>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  },
                  {
                    id: 'page',
                    label: 'Page',
                    width: 80,
                    render: (c) => <span style={{ color: theme.colors.textMuted, fontSize: '0.9rem' }}>{c.pageRange}</span>
                  },
                  {
                    id: 'actions',
                    label: 'Actions',
                    width: 100,
                    align: 'center',
                    render: (c) => {
                      const isSaved = c.status === 'saved'
                      return (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <Button
                            variant="ghost-outline"
                            size="sm"
                            disabled={isSaved}
                            onClick={() => setEditingCandidateId(c.id!)}
                            style={{ color: theme.colors.accent, width: 32, height: 32, padding: 0 }}
                            icon={<Pencil size={15} />}
                          />
                          <Button
                            variant="ghost-outline"
                            size="sm"
                            disabled={isSaved}
                            onClick={() => {
                              setCandidates(prev => prev.filter(x => x.id !== c.id))
                              setSelectedIds(prev => {
                                const next = new Set(prev)
                                next.delete(c.id!)
                                return next
                              })
                            }}
                            style={{ color: theme.colors.danger, width: 32, height: 32, padding: 0 }}
                            icon={<Trash2 size={15} />}
                          />
                        </div>
                      )
                    }
                  }
                ]}
                data={candidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
                selectedIds={selectedIds}
                onSelectIds={(ids: any) => setSelectedIds(ids)}
                getRowId={(c) => c.id!}
              />

              {/* Pagination Controls */}
              {candidates.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.8rem', color: theme.colors.textMuted, fontWeight: 500 }}>Records per page:</span>
                    <div style={{ width: 68 }}>
                      <Select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        options={[{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
                        style={{ padding: '4px 28px 4px 10px', fontSize: '0.8rem', height: 'auto' }}
                      />
                    </div>
                  </div>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
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

      {/* DRAWER */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: editingCandidateId ? 0 : -450,
        width: 450,
        height: '100%',
        background: theme.colors.surface,
        borderLeft: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.lg,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
      }}>
        {editingCandidateId && (
          <EditDrawer
            key={editingCandidateId}
            candidate={candidates.find(c => c.id === editingCandidateId)!}
            onClose={() => setEditingCandidateId(null)}
            onSave={(updated) => {
              setCandidates(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
              setEditingCandidateId(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

function EditDrawer({
  candidate,
  onClose,
  onSave
}: {
  candidate: Candidate;
  onClose: () => void;
  onSave: (updated: Partial<Candidate>) => void;
}) {
  const [type, setType] = useState(candidate.type)
  const [title, setTitle] = useState(candidate.title)
  const [content, setContent] = useState(candidate.content)
  const [tags, setTags] = useState(candidate.tags.join(', '))
  const [pageRange, setPageRange] = useState(candidate.pageRange || '')
  const [isPreview, setIsPreview] = useState(false)

  const handleSave = () => {
    onSave({
      id: candidate.id,
      type,
      title,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      pageRange
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: '24px',
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.colors.surface
      }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pencil size={20} color={theme.colors.accent} />
          Edit Candidate
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} style={{ width: 32, height: 32, padding: 0 }}>
          <X size={18} />
        </Button>
      </div>

      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Type
          </label>
          <Select
            value={type}
            onChange={e => setType(e.target.value)}
            options={ENTRY_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            fullWidth
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: theme.colors.background, border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text, outline: 'none', fontFamily: theme.typography.sans
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>
              Content (Supports Math & Markdown)
            </label>
            <div style={{ display: 'flex', background: theme.colors.background, padding: 2, borderRadius: 6, border: `1px solid ${theme.colors.border}` }}>
              <button
                onClick={() => setIsPreview(false)}
                style={{
                  background: !isPreview ? theme.colors.surface : 'transparent',
                  color: !isPreview ? theme.colors.text : theme.colors.textMuted,
                  border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Code size={14} /> Edit
              </button>
              <button
                onClick={() => setIsPreview(true)}
                style={{
                  background: isPreview ? theme.colors.surface : 'transparent',
                  color: isPreview ? theme.colors.text : theme.colors.textMuted,
                  border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Eye size={14} /> Preview
              </button>
            </div>
          </div>
          {isPreview ? (
            <div style={{
              width: '100%', padding: '12px 14px', borderRadius: 8,
              background: theme.colors.background, border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text, minHeight: 150, fontSize: '0.9rem', lineHeight: 1.6,
              overflowY: 'auto', maxHeight: 300
            }}>
              <MathRenderer content={content || 'No content provided.'} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8,
                background: theme.colors.background, border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text, outline: 'none', fontFamily: theme.typography.mono,
                minHeight: 150, resize: 'vertical', fontSize: '0.9rem', lineHeight: 1.6
              }}
            />
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Tags (Comma Separated)
          </label>
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: theme.colors.background, border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text, outline: 'none', fontFamily: theme.typography.sans
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Page Range
          </label>
          <input
            value={pageRange}
            onChange={e => setPageRange(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: theme.colors.background, border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text, outline: 'none', fontFamily: theme.typography.sans
            }}
          />
        </div>
      </div>

      <div style={{
        padding: '24px',
        borderTop: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        display: 'flex',
        gap: 12
      }}>
        <Button variant="gold" fullWidth onClick={onClose} style={{ height: 44 }}>
          Cancel
        </Button>
        <Button variant="gold" fullWidth onClick={handleSave} icon={<Save size={18} />} style={{ height: 44 }}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}

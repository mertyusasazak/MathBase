// app/components/SourcesView.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Save, BookOpen, Square, CheckSquare, Eye } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { Source } from '@/types'


interface Props {
    sources: Source[]
    onReload: () => void
}

const SOURCE_TYPES = ['pdf', 'markdown', 'manual', 'book', 'paper', 'lecture']

export default function SourcesView({ sources, onReload }: Props) {
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [form, setForm] = useState({ title: '', sourceType: 'book', filepath: '', pageRange: '', bibInfo: '' })
    const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(new Set())

    // Pagination Logic
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const totalPages = Math.max(1, Math.ceil(sources.length / itemsPerPage))
    useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages, currentPage])
    const paginatedSources = sources.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const resetForm = () => { setForm({ title: '', sourceType: 'book', filepath: '', pageRange: '', bibInfo: '' }); setEditId(null); setShowForm(false) }

    const startEdit = (s: Source) => {
        setForm({ title: s.title, sourceType: s.sourceType, filepath: s.filepath, pageRange: s.pageRange, bibInfo: s.bibInfo })
        setEditId(s.id); setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.title.trim()) return
        const url = editId ? `/api/sources/${editId}` : '/api/sources'
        const method = editId ? 'PUT' : 'POST'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        resetForm(); onReload()
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this source?')) return
        await fetch(`/api/sources/${id}`, { method: 'DELETE' })
        const newSet = new Set(selectedSourceIds); newSet.delete(id); setSelectedSourceIds(newSet);
        onReload()
    }

    const handleBulkDelete = async () => {
        if (selectedSourceIds.size === 0) return
        if (!confirm(`Are you sure you want to delete the ${selectedSourceIds.size} selected sources?`)) return

        try {
            const idsToDelete = Array.from(selectedSourceIds)
            for (const id of idsToDelete) {
                await fetch(`/api/sources/${id}`, { method: 'DELETE' })
            }
            setSelectedSourceIds(new Set())
            onReload()
        } catch { alert('Bulk delete failed') }
    }

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, minHeight: 36 }}>
                <h2 style={{ fontFamily: 'EB Garamond, serif', fontSize: '2.2rem', color: '#c9a84c', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center' }}>
                    <BookOpen size={28} style={{ marginRight: 10 }} /> Sources
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.85rem', color: '#7a7870', whiteSpace: 'nowrap' }}>{sources.length} {sources.length === 1 ? 'source' : 'sources'} found</span>
                    {selectedSourceIds.size > 0 && (
                        <button onClick={handleBulkDelete} className="btn-base btn-red">
                            <Trash2 size={16} /> Delete Selected ({selectedSourceIds.size})
                        </button>
                    )}
                    <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-base btn-gold">
                        <Plus size={16} /> Add Source
                    </button>
                </div>
            </div>

            {showForm && (
                <div style={{ background: '#16161a', border: '1px solid #2a2a33', borderRadius: 8, padding: 20, marginBottom: 24 }}>
                    <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.8rem', color: '#c9a84c', marginBottom: 12, fontWeight: 600 }}>
                        {editId ? 'Edit Source' : 'New Source'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" style={inp} />
                        <select value={form.sourceType} onChange={e => setForm(f => ({ ...f, sourceType: e.target.value }))} style={inp}>
                            {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input value={form.filepath} onChange={e => setForm(f => ({ ...f, filepath: e.target.value }))} placeholder="File path or URL" style={inp} />
                        <input value={form.pageRange} onChange={e => setForm(f => ({ ...f, pageRange: e.target.value }))} placeholder="Page range (e.g. 1-50)" style={inp} />
                        <input value={form.bibInfo} onChange={e => setForm(f => ({ ...f, bibInfo: e.target.value }))} placeholder="Bibliography info" style={{ ...inp, gridColumn: '1 / -1' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                        <button onClick={resetForm} className="btn-base btn-outline"><X size={14} /> Cancel</button>
                        <button onClick={handleSave} className="btn-base btn-gold"><Save size={14} /> {editId ? 'Update' : 'Create'}</button>
                    </div>
                </div>
            )}

            {/* Top pagination & Page Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.8rem', color: '#7a7870' }}>Rows per page:</span>
                    <select
                        value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        style={{ background: '#1e1e24', color: '#e8e6df', border: '1px solid #2a2a33', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'Instrument Sans', outline: 'none', cursor: 'pointer' }}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
            <div style={{ background: '#16161a', border: '1px solid #2a2a33', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #2a2a33', background: '#1e1e24' }}>
                            <th style={{ ...th, width: 40, paddingRight: 0 }}>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                    onClick={() => {
                                        const newSet = new Set(selectedSourceIds)
                                        const allSelected = paginatedSources.length > 0 && paginatedSources.every(s => selectedSourceIds.has(s.id))
                                        if (!allSelected) paginatedSources.forEach(s => newSet.add(s.id))
                                        else paginatedSources.forEach(s => newSet.delete(s.id))
                                        setSelectedSourceIds(newSet)
                                    }}>
                                    {(paginatedSources.length > 0 && paginatedSources.every(s => selectedSourceIds.has(s.id))) ? <CheckSquare size={18} color="#c9a84c" /> : <Square size={18} color="#7a7870" />}
                                </button>
                            </th>
                            <th style={th}>Type</th><th style={th}>Title</th><th style={th}>File</th><th style={th}>Entries</th><th style={{ ...th, textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedSources.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#7a7870', fontFamily: 'Instrument Sans', fontSize: '0.9rem' }}>No sources yet. Add one above.</td></tr>
                        ) : paginatedSources.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #2a2a33', transition: 'background 0.2s', cursor: 'pointer' }}
                                onMouseEnter={el => {
                                    el.currentTarget.style.background = '#1e1e24';
                                    const actions = el.currentTarget.querySelector('.row-actions') as HTMLElement;
                                    if (actions) actions.style.opacity = '1';
                                }}
                                onMouseLeave={el => {
                                    el.currentTarget.style.background = 'transparent';
                                    const actions = el.currentTarget.querySelector('.row-actions') as HTMLElement;
                                    if (actions) actions.style.opacity = '0';
                                }}
                            >
                                <td style={{ padding: '16px 0 16px 16px' }} onClick={ev => {
                                    ev.stopPropagation()
                                    const newSet = new Set(selectedSourceIds)
                                    if (selectedSourceIds.has(s.id)) newSet.delete(s.id); else newSet.add(s.id)
                                    setSelectedSourceIds(newSet)
                                }}>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                                        {selectedSourceIds.has(s.id) ? <CheckSquare size={18} color="#c9a84c" /> : <Square size={18} color="#7a7870" />}
                                    </button>
                                </td>
                                <td onClick={() => startEdit(s)} style={{ padding: 12 }}>
                                    <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', background: '#c9a84c22', color: '#c9a84c' }}>{s.sourceType}</span>
                                </td>
                                <td onClick={() => startEdit(s)} style={{ padding: 12, fontFamily: 'EB Garamond', fontSize: '1.05rem', color: '#e8e6df' }}>{s.title}</td>
                                <td onClick={() => startEdit(s)} style={{ padding: 12, fontFamily: 'Instrument Sans', fontSize: '0.8rem', color: '#7a7870' }}>{s.filepath || '—'}</td>
                                <td onClick={() => startEdit(s)} style={{ padding: 12, fontFamily: 'Instrument Sans', fontSize: '0.8rem', color: '#7a7870' }}>{s._count?.entries || 0}</td>
                                <td style={{ padding: 12, textAlign: 'right' }}>
                                    <div className="row-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, opacity: 0, transition: 'opacity 0.2s ease-in-out' }}>
                                        {s.filepath && (
                                            <button onClick={(e) => { e.stopPropagation(); window.open(s.filepath.startsWith('http') ? s.filepath : `${window.location.origin}/${s.filepath.replace(/^\/+/, '')}`, '_blank') }} className="icon-btn icon-btn-green" title="View Source">
                                                <Eye size={15} />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); startEdit(s) }} className="icon-btn icon-btn-gold" title="Edit"><Pencil size={15} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }} className="icon-btn icon-btn-red" title="Delete"><Trash2 size={15} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {sources.length > itemsPerPage && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} style={{ marginTop: 24, padding: '0 8px' }} />
            )}
        </div>
    )
}

const inp: React.CSSProperties = { background: '#1e1e24', border: '1px solid #2a2a33', borderRadius: 6, color: '#e8e6df', fontFamily: 'Instrument Sans', fontSize: '0.85rem', padding: '8px 10px', outline: 'none' }
const th: React.CSSProperties = { padding: 12, fontFamily: 'Instrument Sans', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a7870', fontWeight: 600 }
const primaryBtn: React.CSSProperties = { fontFamily: 'Instrument Sans', fontSize: '0.8rem', fontWeight: 600, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#c9a84c', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const secBtn: React.CSSProperties = { fontFamily: 'Instrument Sans', fontSize: '0.8rem', padding: '8px 14px', borderRadius: 6, border: '1px solid #2a2a33', background: 'transparent', color: '#7a7870', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#7a7870', cursor: 'pointer', padding: '4px 6px' }

'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Save, BookOpen, Square, CheckSquare, Eye } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { theme } from '@/lib/core/theme'
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px', background: theme.colors.background }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, minHeight: 48 }}>
                <h2 style={{ fontFamily: theme.typography.serif, fontSize: '2.5rem', color: theme.colors.accent, fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center' }}>
                    <BookOpen size={32} style={{ marginRight: 16 }} /> Sources
                </h2>
                <style>{`
                    .row-hover-group:hover { background: ${theme.colors.surfaceHover} !important; }
                    .row-actions { opacity: 1; display: flex; gap: 6; justify-content: center; align-items: center; transition: all 0.2s ease-in-out; }
                `}</style>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: theme.typography.sans, fontSize: '0.9rem', color: theme.colors.textMuted, whiteSpace: 'nowrap' }}>{sources.length} records</span>
                    {selectedSourceIds.size > 0 && (
                        <Button variant="danger" onClick={handleBulkDelete} icon={<Trash2 size={16} />}>
                            Delete ({selectedSourceIds.size})
                        </Button>
                    )}
                    <Button variant="gold" onClick={() => { resetForm(); setShowForm(true) }} icon={<Plus size={16} />}>
                        Add Source
                    </Button>
                </div>
            </div>

            {showForm && (
                <div style={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 12, padding: 24, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontFamily: theme.typography.sans, fontSize: '0.8rem', color: theme.colors.accent, marginBottom: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {editId ? 'Edit Source' : 'New Source Registration'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Source Title" label="Title" />
                        <Select 
                            value={form.sourceType} 
                            onChange={e => setForm(f => ({ ...f, sourceType: e.target.value }))} 
                            label="Type"
                            options={SOURCE_TYPES.map(t => ({ value: t, label: t.toUpperCase() }))}
                        />
                        <Input value={form.filepath} onChange={e => setForm(f => ({ ...f, filepath: e.target.value }))} placeholder="File path or URL" label="Filepath" />
                        <Input value={form.pageRange} onChange={e => setForm(f => ({ ...f, pageRange: e.target.value }))} placeholder="1-50" label="Page Range" />
                        <Input value={form.bibInfo} onChange={e => setForm(f => ({ ...f, bibInfo: e.target.value }))} placeholder="Journal, DOI, ISBN..." label="Bibliography" style={{ gridColumn: '1 / -1' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                        <Button variant="outline" onClick={resetForm} icon={<X size={16} />}>Cancel</Button>
                        <Button variant="gold" onClick={handleSave} icon={<Save size={16} />}>{editId ? 'Update Source' : 'Create Source'}</Button>
                    </div>
                </div>
            )}

            {/* Top pagination & Page Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: theme.typography.sans, fontSize: '0.85rem', color: theme.colors.textMuted, fontWeight: 600 }}>Records per page:</span>
                    <div style={{ width: 80 }}>
                        <Select
                            value={itemsPerPage} 
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            options={[
                                { value: 10, label: '10' },
                                { value: 25, label: '25' },
                                { value: 50, label: '50' },
                                { value: 100, label: '100' }
                            ]}
                        />
                    </div>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>

            <div style={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.surfaceHover }}>
                            <th style={{ padding: '12px 16px', width: 50 }}>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                    onClick={() => {
                                        const newSet = new Set(selectedSourceIds)
                                        const allSelected = paginatedSources.length > 0 && paginatedSources.every(s => selectedSourceIds.has(s.id))
                                        if (!allSelected) paginatedSources.forEach(s => newSet.add(s.id))
                                        else paginatedSources.forEach(s => newSet.delete(s.id))
                                        setSelectedSourceIds(newSet)
                                    }}>
                                    {(paginatedSources.length > 0 && paginatedSources.every(s => selectedSourceIds.has(s.id))) ? <CheckSquare size={18} color={theme.colors.accent} /> : <Square size={18} color={theme.colors.textMuted} />}
                                </button>
                            </th>
                            <th style={{ ...thStyle, width: 110 }}>Type</th>
                            <th style={{ ...thStyle, width: '40%' }}>Title</th>
                            <th style={{ ...thStyle, width: '25%' }}>File</th>
                            <th style={{ ...thStyle, width: 120 }}>Entries</th>
                            <th style={{ ...thStyle, textAlign: 'center', width: 120 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ background: theme.colors.background }}>
                        {paginatedSources.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: theme.colors.textMuted, fontFamily: theme.typography.sans }}>No archive sources available.</td></tr>
                        ) : paginatedSources.map(s => (
                            <tr key={s.id} style={{ borderBottom: `1px solid ${theme.colors.border}`, transition: theme.animations.fast, cursor: 'pointer' }}
                                className="row-hover-group"
                                onClick={() => startEdit(s)}
                            >
                                <td style={{ padding: '12px 16px' }} onClick={ev => {
                                    ev.stopPropagation()
                                    const newSet = new Set(selectedSourceIds)
                                    if (selectedSourceIds.has(s.id)) newSet.delete(s.id); else newSet.add(s.id)
                                    setSelectedSourceIds(newSet)
                                }}>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                                        {selectedSourceIds.has(s.id) ? <CheckSquare size={18} color={theme.colors.accent} /> : <Square size={18} color={theme.colors.textMuted} />}
                                    </button>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{ 
                                        fontFamily: theme.typography.sans, 
                                        fontSize: '0.65rem', 
                                        fontWeight: 700, 
                                        padding: '4px 10px', 
                                        borderRadius: 4, 
                                        textTransform: 'uppercase', 
                                        background: `${theme.colors.accent}15`, 
                                        color: theme.colors.accent,
                                        letterSpacing: '0.05em'
                                    }}>{s.sourceType}</span>
                                </td>
                                <td style={{ padding: '12px 16px', fontFamily: theme.typography.serif, fontSize: '1.1rem', color: theme.colors.text }}>{s.title}</td>
                                <td style={{ padding: '12px 16px', fontFamily: theme.typography.sans, fontSize: '0.85rem', color: theme.colors.textMuted }}>{s.filepath || '—'}</td>
                                <td style={{ padding: '12px 16px', fontFamily: theme.typography.sans, fontSize: '0.85rem', color: theme.colors.textDim }}>{s._count?.entries || 0} items</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <div className="row-actions">
                                        {s.filepath && (
                                            <Button variant="ghost" size="sm" style={{ color: theme.colors.success }} onClick={(e) => { e.stopPropagation(); window.open(s.filepath.startsWith('http') ? s.filepath : `${window.location.origin}/${s.filepath.replace(/^\/+/, '')}`, '_blank') }} icon={<Eye size={15} />} />
                                        )  }
                                        <Button variant="ghost" size="sm" style={{ color: theme.colors.accent }} onClick={(e) => { e.stopPropagation(); startEdit(s) }} icon={<Pencil size={15} />} />
                                        <Button variant="ghost" size="sm" style={{ color: theme.colors.danger }} onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }} icon={<Trash2 size={15} />} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {sources.length > itemsPerPage && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} style={{ marginTop: 24 }} />
            )}
        </div>
    )
}

const thStyle: React.CSSProperties = { 
    padding: '12px 16px', 
    fontFamily: theme.typography.sans, 
    fontSize: '0.72rem', 
    textTransform: 'uppercase', 
    letterSpacing: '0.12em', 
    color: theme.colors.textMuted, 
    fontWeight: 700,
    textAlign: 'left'
}

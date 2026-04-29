'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Save, BookOpen, Eye, Filter, ArrowUp } from 'lucide-react'
import { Button, Input, Select, Badge } from '@/components/ui/Common'
import Pagination from '@/components/ui/Pagination'
import { theme } from '@/lib/core/theme'
import { Source } from '@/types'
import { DataTable, Column } from '@/components/ui/DataTable'
import FilterBar from '@/components/ui/FilterBar'
import { SOURCE_TYPE_COLORS } from '@/lib/core/constants'

interface Props {
  sources: Source[]
  onReload: () => void
  onSelectSource: (s: Source) => void
}

const SOURCE_TYPES = ['pdf', 'markdown', 'manual', 'book', 'paper', 'lecture']

export default function SourcesView({ sources, onReload, onSelectSource }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ title: '', sourceType: 'book', filepath: '', pageRange: '', bibInfo: '' })
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(new Set())

  // Pagination & Filtering
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilter, setShowFilter] = useState(false)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [activeTitles, setActiveTitles] = useState<Set<string>>(new Set())

  const [showScrollTop, setShowScrollTop] = useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 300)
  }

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filteredSources = sources.filter(s => {
    if (activeTypes.size > 0 && !activeTypes.has(s.sourceType)) return false
    if (activeTitles.size > 0 && !activeTitles.has(s.title)) return false
    return true
  })

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'title', direction: 'asc' })

  const sortedSources = [...filteredSources].sort((a: any, b: any) => {
    if (!sortConfig.direction || !sortConfig.key) return 0
    let vA = a[sortConfig.key]
    let vB = b[sortConfig.key]

    // Handle Count sorting
    if (sortConfig.key === 'entriesCount') {
      vA = a._count?.entries || 0
      vB = b._count?.entries || 0
    } else if (typeof vA === 'string') {
      vA = vA.toLowerCase()
      vB = vB.toLowerCase()
    }

    if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1
    if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sortedSources.length / itemsPerPage))
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages, currentPage])
  const paginatedSources = sortedSources.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
      for (const id of Array.from(selectedSourceIds)) {
        await fetch(`/api/sources/${id}`, { method: 'DELETE' })
      }
      setSelectedSourceIds(new Set())
      onReload()
    } catch { alert('Bulk delete failed') }
  }

  const onSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc'
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc'
      else if (sortConfig.direction === 'desc') direction = null
    }
    setSortConfig({ key, direction })
  }

  const columns: Column<Source>[] = [
    {
      id: 'sourceType',
      label: 'Type',
      width: 110,
      sortable: true,
      render: (s) => (
        <Badge variant="muted" color={SOURCE_TYPE_COLORS[s.sourceType] || SOURCE_TYPE_COLORS.other}>
          {s.sourceType.toUpperCase()}
        </Badge>
      )
    },
    {
      id: 'title',
      label: 'Title',
      width: '35%',
      sortable: true,
      render: (s) => <span style={{ fontFamily: theme.typography.serif, fontSize: '1.05rem', color: theme.colors.text }}>{s.title}</span>
    },
    {
      id: 'filepath',
      label: 'Filepath',
      width: '20%',
      render: (s) => <span style={{ fontSize: '0.85rem', color: theme.colors.textMuted }}>{s.filepath || '—'}</span>
    },
    {
      id: 'entriesCount',
      label: 'Entries',
      width: 100,
      sortable: true,
      render: (s) => <span style={{ fontSize: '0.85rem', color: theme.colors.textDim }}>{s._count?.entries || 0} items</span>
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 130,
      align: 'center',
      render: (s) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }} onClick={ev => ev.stopPropagation()}>
          {s.filepath && (
            <Button variant="ghost-outline" size="sm" style={{ color: theme.colors.success }} onClick={() => window.open(s.filepath.startsWith('http') ? s.filepath : `${window.location.origin}/${s.filepath.replace(/^\/+/, '')}`, '_blank')} icon={<Eye size={15} />} />
          )}
          <Button variant="ghost-outline" size="sm" style={{ color: theme.colors.accent }} onClick={() => startEdit(s)} icon={<Pencil size={15} />} />
          <Button variant="ghost-outline" size="sm" style={{ color: theme.colors.danger }} onClick={() => handleDelete(s.id)} icon={<Trash2 size={15} />} />
        </div>
      )
    }
  ]

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{ flex: 1, overflowY: 'auto', padding: '40px 60px', position: 'relative' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: theme.typography.serif, fontSize: '2.5rem', color: theme.colors.accent, fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center' }}>
          <BookOpen size={32} style={{ marginRight: 16 }} />
          Sources
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.9rem', color: theme.colors.textMuted }}>{sources.length} records</span>
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

      <div style={{ marginBottom: 16 }}>
        <Button variant={showFilter ? 'gold' : 'outline'} onClick={() => setShowFilter(!showFilter)} icon={<Filter size={18} />}>
          Filter
          {(activeTypes.size + activeTitles.size) > 0 && (
            <Badge variant="solid" style={{ marginLeft: 4 }}>
              {(activeTypes.size + activeTitles.size)}
            </Badge>
          )}
        </Button>
      </div>

      <FilterBar
        isVisible={showFilter}
        onClose={() => setShowFilter(false)}
        onResetAll={() => { setActiveTypes(new Set()); setActiveTitles(new Set()); }}
        columns={[
          { id: 'sourceType', label: 'Type', options: SOURCE_TYPES, activeValues: activeTypes, onToggle: setActiveTypes },
          { id: 'title', label: 'Title', options: [...new Set(sources.map(s => s.title))].sort(), activeValues: activeTitles, onToggle: setActiveTitles }
        ]}
      />

      <DataTable
        data={paginatedSources}
        columns={columns}
        getRowId={(s) => s.id}
        selectedIds={selectedSourceIds}
        onSelectIds={(ids: any) => setSelectedSourceIds(ids)}
        sortConfig={sortConfig}
        onSort={onSort}
        onRowClick={onSelectSource}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: theme.colors.textMuted, fontWeight: 500 }}>Records per page:</span>
          <div style={{ width: 68 }}>
            <Select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              options={[{ value: 10, label: '10' }, { value: 25, label: '25' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
              style={{ padding: '4px 28px 4px 10px', fontSize: '0.8rem', height: 'auto' }}
            />
          </div>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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

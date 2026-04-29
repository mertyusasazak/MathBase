'use client'

import React from 'react'
import { 
  ArrowLeft, User, Calendar, Link2, Plus, 
  ExternalLink, FileText, Search, X, Trash2, Unlink
} from 'lucide-react'
import { Button, Badge, Input, Select } from '@/components/ui/Common'
import Pagination from '@/components/ui/Pagination'
import { theme } from '@/lib/core/theme'
import { Entry, Source } from '@/types'
import { TYPE_COLORS, SOURCE_TYPE_COLORS } from '@/lib/core/constants'
import { DataTable, Column } from '@/components/ui/DataTable'
import { renderTitle } from '@/lib/core/math'
import { useAppContext } from '@/lib/context/AppContext'

interface Props {
  source: Source
  entries: Entry[]
  allEntries: Entry[]
  onBack: () => void
  onSelectEntry: (e: Entry) => void
  onReload: () => void
}

export default function SourceDetailView({ source, entries, allEntries, onBack, onSelectEntry, onReload }: Props) {
  const [search, setSearch] = React.useState('')
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [modalSearch, setModalSearch] = React.useState('')
  const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'title', direction: 'asc' })
  
  // Pagination state
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  
  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const sortedEntries = [...filteredEntries].sort((a: any, b: any) => {
    if (!sortConfig.direction || !sortConfig.key) return 0
    let vA = sortConfig.key === 'Type' ? a.type : a.title
    let vB = sortConfig.key === 'Type' ? b.type : b.title
    vA = vA.toLowerCase(); vB = vB.toLowerCase()
    if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1
    if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  // Paginated data
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / itemsPerPage))
  React.useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages, currentPage])
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const availableEntries = allEntries.filter(e => 
    e.sourceId !== source.id && 
    (e.title.toLowerCase().includes(modalSearch.toLowerCase()) || e.type.toLowerCase().includes(modalSearch.toLowerCase()))
  )

  const handleAddEntryToSource = async (entry: Entry) => {
    try {
      await fetch(`/api/entry/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, sourceId: source.id })
      })
      onReload()
    } catch (err) {
      console.error('Failed to add entry to source:', err)
    }
  }

  const handleDeleteFromSource = async () => {
    if (!confirm(`Are you sure you want to remove ${selectedIds.size} entries from this source?`)) return
    try {
      await Promise.all([...selectedIds].map(async id => {
        const entry = allEntries.find(e => e.id === id)
        if (entry) {
          return fetch(`/api/entry/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...entry, sourceId: null })
          })
        }
      }))
      setSelectedIds(new Set())
      onReload()
    } catch (err) {
      console.error('Failed to delete entries from source:', err)
    }
  }

  const onSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc'
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc'
      else if (sortConfig.direction === 'desc') direction = null
    }
    setSortConfig({ key, direction })
  }

  const columns: Column<Entry>[] = [
    {
      id: 'type',
      label: 'Type',
      width: 120,
      sortable: true,
      render: (e) => <Badge variant="solid" color={TYPE_COLORS[e.type]}>{e.type.toUpperCase()}</Badge>
    },
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      render: (e) => <span style={{ fontFamily: theme.typography.serif, fontSize: '1.1rem', color: theme.colors.text }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
    },
    {
      id: 'pageRange',
      label: 'Page',
      width: 80,
      render: (e) => <span style={{ fontSize: '0.85rem', color: theme.colors.textMuted }}>{e.pageRange || '—'}</span>
    },
    {
      id: 'tags',
      label: 'Tags',
      width: '25%',
      render: (e) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {e.tags.map(t => <span key={t} style={{ fontSize: '0.65rem', color: theme.colors.accent, fontWeight: 600 }}>#{t}</span>)}
        </div>
      )
    }
  ]

  const modalColumns: Column<Entry>[] = [
    {
      id: 'type',
      label: 'Type',
      width: 100,
      render: (e) => <Badge variant="muted" color={TYPE_COLORS[e.type]}>{e.type.toUpperCase()}</Badge>
    },
    {
      id: 'title',
      label: 'Title',
      render: (e) => <span style={{ fontSize: '0.9rem', color: theme.colors.text }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
    },
    {
      id: 'action',
      label: '',
      width: 60,
      render: (e) => (
        <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); handleAddEntryToSource(e); }} icon={<Plus size={16} />} />
      )
    }
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: theme.colors.background }}>
      {/* HEADER - Compact Sans-Serif Style */}
      <div style={{
        padding: '12px 24px',
        borderBottom: `1px solid ${theme.colors.border}`,
        background: theme.colors.background,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <Button variant="outline" size="sm" onClick={onBack} icon={<ArrowLeft size={16} />}>Back</Button>
          <Badge variant="solid" color={SOURCE_TYPE_COLORS[source.sourceType] || SOURCE_TYPE_COLORS.other}>
            {source.sourceType.toUpperCase()}
          </Badge>
          <h1 style={{ 
            fontFamily: theme.typography.sans, 
            fontSize: '1.4rem', 
            color: theme.colors.text, 
            margin: 0,
            fontWeight: 600
          }}>
            {source.title}
          </h1>
        </div>

        {(source.authors || source.year || source.bibInfo) && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', opacity: 0.8 }}>
            {source.authors && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: '0.85rem' }}>
                <User size={14} color={theme.colors.accent} />
                <span>{source.authors}</span>
              </div>
            )}
            {source.year && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: '0.85rem' }}>
                <Calendar size={14} color={theme.colors.accent} />
                <span>{source.year}</span>
              </div>
            )}
            {source.bibInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: '0.85rem' }}>
                <Link2 size={14} color={theme.colors.accent} />
                <span style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {source.bibInfo}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileText size={20} color={theme.colors.accent} />
            <h3 style={{ fontFamily: theme.typography.sans, fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>
              Entries in this Source
            </h3>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {source.filepath && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(source.filepath.startsWith('http') ? source.filepath : `${window.location.origin}/${source.filepath.replace(/^\/+/, '')}`, '_blank')}
                icon={<ExternalLink size={14} />}
                style={{ fontSize: '0.8rem' }}
              >
                View Source File
              </Button>
            )}
            <Button variant="gold" size="sm" onClick={() => setShowAddModal(true)} icon={<Plus size={18} />}>
              Add Existing Entry
            </Button>
          </div>
        </div>

        <DataTable 
          data={paginatedEntries}
          columns={columns}
          getRowId={(e) => e.id}
          onRowClick={onSelectEntry}
          selectedIds={selectedIds}
          onSelectIds={(ids: any) => setSelectedIds(ids)}
          sortConfig={sortConfig}
          onSort={onSort}
          emptyMessage="No entries associated with this source."
        />

        {/* BULK ACTIONS & PAGINATION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px', background: `${theme.colors.accent}15`, borderRadius: 8, border: `1px solid ${theme.colors.accent}30` }}>
                <span style={{ fontSize: '0.85rem', color: theme.colors.accent, fontWeight: 600 }}>{selectedIds.size} selected</span>
                <div style={{ width: 1, height: 16, background: theme.colors.accent, opacity: 0.3 }} />
                <Button variant="ghost" size="sm" onClick={handleDeleteFromSource} icon={<Trash2 size={14} />} style={{ color: '#ff4d4f' }}>Delete from Source</Button>
              </div>
            )}

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
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* ADD EXISTING MODAL */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 40
        }} onClick={() => setShowAddModal(false)}>
          <div 
            style={{
              width: '100%', maxWidth: 800, maxHeight: '80vh',
              background: theme.colors.background, border: `1px solid ${theme.colors.border}`,
              borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: theme.colors.text }}>Add Existing Entries</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: theme.colors.textMuted }}>Assign other entries from your library to this source</p>
              </div>
              <Button variant="ghost" onClick={() => setShowAddModal(false)} icon={<X size={20} />} />
            </div>

            <div style={{ padding: '24px 32px 12px 32px', background: theme.colors.surface }}>
              <Input 
                value={modalSearch} 
                onChange={e => setModalSearch(e.target.value)} 
                placeholder="Search entries to add..." 
                icon={<Search size={16} />}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 32px 32px' }}>
              <DataTable 
                data={availableEntries}
                columns={modalColumns}
                getRowId={(e) => e.id}
                emptyMessage="No other entries found."
              />
            </div>
            
            <div style={{ padding: '16px 32px', borderTop: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'flex-end', background: theme.colors.surface }}>
              <Button variant="gold" onClick={() => setShowAddModal(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

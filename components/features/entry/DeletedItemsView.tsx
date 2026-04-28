'use client'

import React from 'react'
import { Trash2, RotateCcw, Filter } from 'lucide-react'
import { Button, Badge, Select } from '@/components/ui/Common'
import Pagination from '@/components/ui/Pagination'
import FilterBar from '@/components/ui/FilterBar'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { DeletedItem } from '@/types'
import { TYPE_COLORS, SOURCE_TYPE_COLORS } from '@/lib/core/constants'
import { DataTable, Column } from '@/components/ui/DataTable'

interface DeletedItemsViewProps {
  items: DeletedItem[]
  loading: boolean
  itemsPerPage: number
  setItemsPerPage: (val: number) => void
  currentPage: number
  setCurrentPage: (val: number) => void
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  onRestore: (item: DeletedItem) => void
  onPermanentDelete: (item: DeletedItem) => void
  onBulkRestore: () => void
  onBulkPermanentDelete: () => void
  onDeleteAll: () => void
  sortConfig: { key: string, direction: 'asc' | 'desc' | null }
  onSort: (key: string) => void
  showFilter: boolean
  setShowFilter: (val: boolean) => void
  activeTags: Set<string>
  setActiveTags: (val: Set<string>) => void
  activeTypes: Set<string>
  setActiveTypes: (val: Set<string>) => void
  activeTitles: Set<string>
  setActiveTitles: (val: Set<string>) => void
}

export const DeletedItemsView: React.FC<DeletedItemsViewProps> = (props) => {
  const {
    items, loading, itemsPerPage, setItemsPerPage, currentPage, setCurrentPage,
    selectedIds, setSelectedIds, onRestore, onPermanentDelete, onBulkRestore,
    onBulkPermanentDelete, onDeleteAll, sortConfig, onSort, showFilter, setShowFilter,
    activeTags, setActiveTags, activeTypes, setActiveTypes, activeTitles, setActiveTitles
  } = props

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const allTags = [...new Set(items.flatMap(e => e.tags || []))].sort()
  const allTitles = [...new Set(items.map(e => e.title || ''))].sort()
  const ENTRY_TYPES = ['definition', 'theorem', 'lemma', 'corollary', 'example', 'remark']

  const getDeletedKey = (item: DeletedItem) => `${item.deletedItemType}-${item.id}`

  const columns: Column<DeletedItem>[] = [
    {
      id: 'type',
      label: 'Type',
      width: 110,
      sortable: true,
      render: (e) => {
        const displayType = e.deletedItemType === 'source' ? (e.sourceType || 'PDF').toUpperCase() : (e.type || 'entry')
        const typeColor = e.deletedItemType === 'source' 
          ? (SOURCE_TYPE_COLORS[e.sourceType!] || theme.colors.accent) 
          : (TYPE_COLORS[e.type!] || theme.colors.textMuted)
        return <Badge variant="solid" color={typeColor}>{displayType}</Badge>
      }
    },
    {
      id: 'title',
      label: 'Title',
      width: '40%',
      sortable: true,
      render: (e) => (
        <div
          style={{ fontFamily: theme.typography.serif, fontSize: '1.05rem', opacity: 0.6 }}
          dangerouslySetInnerHTML={{ __html: renderTitle(e.title!) }}
        />
      )
    },
    {
      id: 'dateDeleted',
      label: 'Date Deleted',
      width: '25%',
      sortable: true,
      render: (e) => <span style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>{new Date(e.updatedAt || e.createdAt!).toLocaleDateString()}</span>
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 120,
      align: 'center',
      render: (e) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
          <Button variant="ghost-outline" size="sm" style={{ color: theme.colors.success }} onClick={() => onRestore(e)} icon={<RotateCcw size={15} />} />
          <Button variant="ghost-outline" size="sm" style={{ color: theme.colors.danger }} onClick={() => onPermanentDelete(e)} icon={<Trash2 size={15} />} />
        </div>
      )
    }
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: theme.typography.serif, fontSize: '2.2rem', color: theme.colors.danger, fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center' }}>
          <Trash2 size={28} style={{ marginRight: 10 }} />
          Recently Deleted
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.85rem', color: theme.colors.textMuted }}>{items.length} records</span>
          {selectedIds.size > 0 ? (
            <>
              <Button variant="success" onClick={onBulkRestore} icon={<RotateCcw size={16} />}>Restore ({selectedIds.size})</Button>
              <Button variant="danger" onClick={onBulkPermanentDelete} icon={<Trash2 size={16} />}>Delete Permanently ({selectedIds.size})</Button>
            </>
          ) : (
            items.length > 0 && <Button variant="danger" onClick={onDeleteAll} icon={<Trash2 size={16} />}>Delete All Permanently</Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button variant={showFilter ? 'gold' : 'outline'} onClick={() => setShowFilter(!showFilter)} icon={<Filter size={16} />}>
          Filter
        </Button>
      </div>

      <FilterBar
        isVisible={showFilter}
        onClose={() => setShowFilter(false)}
        onResetAll={() => { setActiveTags(new Set()); setActiveTypes(new Set()); setActiveTitles(new Set()); }}
        columns={[
          { id: 'type', label: 'Type', options: ENTRY_TYPES, activeValues: activeTypes, onToggle: setActiveTypes },
          { id: 'title', label: 'Title', options: allTitles, activeValues: activeTitles, onToggle: setActiveTitles },
          { id: 'tags', label: 'Tags', options: allTags, activeValues: activeTags, onToggle: setActiveTags, style: 'tag' },
        ]}
      />

      <DataTable
        data={paginated}
        columns={columns}
        loading={loading}
        emptyMessage="Trash is empty."
        selectedIds={selectedIds}
        onSelectIds={(ids: any) => setSelectedIds(ids)}
        getRowId={getDeletedKey}
        sortConfig={sortConfig}
        onSort={onSort}
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
    </div>
  )
}

'use client'

import React from 'react'
import { 
  Square, CheckSquare, Trash2, RotateCcw, Filter, ArrowUp, ArrowDown
} from 'lucide-react'
import { Button, Badge, Select } from '@/components/ui/Common'
import Pagination from '@/components/ui/Pagination'
import FilterBar from '@/components/features/entries/FilterBar'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { DeletedItem } from '@/types'
import { TYPE_COLORS } from '@/lib/core/constants'

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

export const DeletedItemsView: React.FC<DeletedItemsViewProps> = ({
  items,
  loading,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  selectedIds,
  setSelectedIds,
  onRestore,
  onPermanentDelete,
  onBulkRestore,
  onBulkPermanentDelete,
  onDeleteAll,
  sortConfig,
  onSort,
  showFilter,
  setShowFilter,
  activeTags,
  setActiveTags,
  activeTypes,
  setActiveTypes,
  activeTitles,
  setActiveTitles
}) => {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const allTags = [...new Set(items.flatMap(e => e.tags || []))].sort()
  const allTitles = [...new Set(items.map(e => e.title || ''))].sort()
  const ENTRY_TYPES = ['definition', 'theorem', 'lemma', 'corollary', 'example', 'remark']

  const getDeletedKey = (item: DeletedItem) => `${item.deletedItemType}-${item.id}`

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return null
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} style={{ marginLeft: 4, display: 'inline' }} /> : <ArrowDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
  }

  const tableHeaderStyle: React.CSSProperties = { 
    padding: '12px 16px', 
    fontFamily: theme.typography.sans, 
    fontSize: '0.72rem', 
    textTransform: 'uppercase', 
    letterSpacing: '0.12em', 
    color: theme.colors.textMuted, 
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none',
    textAlign: 'left'
  }

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
        <Button
          variant={showFilter ? 'gold' : 'outline'}
          onClick={() => setShowFilter(!showFilter)}
          icon={<Filter size={16} />}
        >
          Filter
        </Button>
      </div>

      <FilterBar
        isVisible={showFilter}
        onClose={() => setShowFilter(false)}
        onResetAll={() => {
          setActiveTags(new Set()); setActiveTypes(new Set()); setActiveTitles(new Set());
        }}
        columns={[
          { id: 'type', label: 'Type', options: ENTRY_TYPES, activeValues: activeTypes, onToggle: setActiveTypes },
          { id: 'title', label: 'Title', options: allTitles, activeValues: activeTitles, onToggle: setActiveTitles },
          { id: 'tags', label: 'Tags', options: allTags, activeValues: activeTags, onToggle: setActiveTags, style: 'tag' },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.85rem', color: theme.colors.textMuted, fontWeight: 600 }}>Records per page:</span>
          <div style={{ width: 80 }}>
            <Select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} options={[{ value: 10, label: '10' }, { value: 25, label: '25' }, { value: 50, label: '50' }, { value: 100, label: '100' }]} />
          </div>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <div style={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.surfaceHover }}>
              <th style={{ ...tableHeaderStyle, width: 50 }} onClick={() => {
                const keys = paginated.map(getDeletedKey);
                if (keys.every(k => selectedIds.has(k))) {
                  const next = new Set(selectedIds); keys.forEach(k => next.delete(k)); setSelectedIds(next);
                } else {
                  const next = new Set(selectedIds); keys.forEach(k => next.add(k)); setSelectedIds(next);
                }
              }}>
                {paginated.length > 0 && paginated.every(i => selectedIds.has(getDeletedKey(i))) ? <CheckSquare size={18} color={theme.colors.danger} /> : <Square size={18} color={theme.colors.textMuted} />}
              </th>
              <th style={{ ...tableHeaderStyle, width: 110 }} onClick={() => onSort('Type')}>Type {renderSortIcon('Type')}</th>
              <th style={{ ...tableHeaderStyle, width: '40%' }} onClick={() => onSort('Title')}>Title {renderSortIcon('Title')}</th>
              <th style={{ ...tableHeaderStyle, width: '25%' }} onClick={() => onSort('Last Update')}>Date Deleted {renderSortIcon('Last Update')}</th>
              <th style={{ ...tableHeaderStyle, width: 120, textAlign: 'center', cursor: 'default' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ background: theme.colors.background }}>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center' }}>Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center' }}>Trash is empty.</td></tr>
            ) : paginated.map(e => {
              const key = getDeletedKey(e)
              const displayType = e.deletedItemType === 'source' ? (e.sourceType || 'PDF').toUpperCase() : (e.type || 'entry')
              const typeColor = e.deletedItemType === 'source' ? theme.colors.accent : (TYPE_COLORS[e.type!] || theme.colors.textMuted)
              return (
                <tr 
                  key={key} 
                  className="row-hover-group"
                  style={{ 
                    borderBottom: `1px solid ${theme.colors.border}`, 
                    transition: theme.animations.fast,
                    background: selectedIds.has(key) ? `${theme.colors.danger}06` : 'transparent' 
                  }}
                >
                  <td style={{ padding: '12px 16px' }} onClick={() => {
                    const next = new Set(selectedIds)
                    if (next.has(key)) next.delete(key); else next.add(key)
                    setSelectedIds(next)
                  }}>
                    {selectedIds.has(key) ? <CheckSquare size={18} color={theme.colors.danger} /> : <Square size={18} color={theme.colors.textMuted} />}
                  </td>
                  <td style={{ padding: '12px 16px' }}><Badge variant="solid" color={typeColor}>{displayType}</Badge></td>
                  <td style={{ padding: '12px 16px', fontFamily: theme.typography.serif, fontSize: '1.05rem', opacity: 0.6 }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title!) }} />
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: theme.colors.textMuted }}>{new Date(e.updatedAt || e.createdAt!).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      <Button variant="ghost" size="sm" style={{ color: theme.colors.success }} onClick={() => onRestore(e)} icon={<RotateCcw size={15} />} />
                      <Button variant="ghost" size="sm" style={{ color: theme.colors.danger }} onClick={() => onPermanentDelete(e)} icon={<Trash2 size={15} />} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

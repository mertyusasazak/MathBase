'use client'

import React from 'react'
import { 
  Square, CheckSquare, Pencil, Trash2, ArrowUp, ArrowDown, Filter, Library
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Pagination from '@/components/ui/Pagination'
import FilterBar from '@/components/features/entries/FilterBar'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { Entry } from '@/types'
import { TYPE_COLORS } from '@/lib/core/constants'

interface EntriesViewProps {
  entries: Entry[]
  loading: boolean
  search: string
  itemsPerPage: number
  setItemsPerPage: (val: number) => void
  currentPage: number
  setCurrentPage: (val: number) => void
  selectedIds: Set<number>
  setSelectedIds: (ids: Set<number>) => void
  onSelectEntry: (entry: Entry) => void
  onEditEntry: (entry: Entry) => void
  onDeleteEntry: (id: number) => void
  onBulkDelete: () => void
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

export const EntriesView: React.FC<EntriesViewProps> = ({
  entries,
  loading,
  search,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  selectedIds,
  setSelectedIds,
  onSelectEntry,
  onEditEntry,
  onDeleteEntry,
  onBulkDelete,
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
  const totalPages = Math.max(1, Math.ceil(entries.length / itemsPerPage))
  const paginated = entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const allTags = [...new Set(entries.flatMap(e => e.tags))].sort()
  const allTitles = [...new Set(entries.map(e => e.title))].sort()
  const ENTRY_TYPES = ['definition', 'theorem', 'lemma', 'corollary', 'example', 'remark']

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return null
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} style={{ marginLeft: 4, display: 'inline' }} /> : <ArrowDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
  }

  const tableHeaderStyle: React.CSSProperties = { 
    padding: '16px', 
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
        <h2 style={{ fontFamily: theme.typography.serif, fontSize: '2.5rem', color: theme.colors.accent, fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center' }}>
          <Library size={32} style={{ marginRight: 16 }} />
          {search ? `Search Results` : 'Knowledge Repository'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.9rem', color: theme.colors.textMuted }}>{entries.length} records</span>
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={onBulkDelete} icon={<Trash2 size={16} />}>
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button
          variant={showFilter ? 'gold' : 'outline'}
          onClick={() => setShowFilter(!showFilter)}
          icon={<Filter size={18} />}
        >
          Filter
          {(activeTags.size + activeTypes.size + activeTitles.size) > 0 && (
            <Badge variant="solid" style={{ marginLeft: 4 }}>
              {(activeTags.size + activeTypes.size + activeTitles.size)}
            </Badge>
          )}
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
                if (paginated.every(e => selectedIds.has(e.id))) {
                  const next = new Set(selectedIds)
                  paginated.forEach(e => next.delete(e.id))
                  setSelectedIds(next)
                } else {
                  const next = new Set(selectedIds)
                  paginated.forEach(e => next.add(e.id))
                  setSelectedIds(next)
                }
              }}>
                {paginated.every(e => selectedIds.has(e.id)) ? <CheckSquare size={18} color={theme.colors.accent} /> : <Square size={18} color={theme.colors.textMuted} />}
              </th>
              <th style={{ ...tableHeaderStyle, width: 110 }} onClick={() => onSort('Type')}>Type {renderSortIcon('Type')}</th>
              <th style={{ ...tableHeaderStyle, width: '25%' }} onClick={() => onSort('Title')}>Title {renderSortIcon('Title')}</th>
              <th style={{ ...tableHeaderStyle, width: '20%' }}>Tags</th>
              <th style={{ ...tableHeaderStyle, width: '20%' }}>Commit</th>
              <th style={{ ...tableHeaderStyle, width: 130 }} onClick={() => onSort('Last Update')}>Last Update {renderSortIcon('Last Update')}</th>
              <th style={{ ...tableHeaderStyle, width: 100, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ background: theme.colors.background }}>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>No records found.</td></tr>
            ) : paginated.map(e => (
              <tr 
                key={e.id} 
                onClick={() => onSelectEntry(e)} 
                className="row-hover-group"
                style={{ 
                  borderBottom: `1px solid ${theme.colors.border}`, 
                  cursor: 'pointer', 
                  transition: theme.animations.fast,
                  background: selectedIds.has(e.id) ? `${theme.colors.accent}08` : 'transparent' 
                }}
              >
                <td style={{ padding: '12px 16px' }} onClick={ev => {
                  ev.stopPropagation()
                  const next = new Set(selectedIds)
                  if (next.has(e.id)) next.delete(e.id); else next.add(e.id)
                  setSelectedIds(next)
                }}>
                  {selectedIds.has(e.id) ? <CheckSquare size={18} color={theme.colors.accent} /> : <Square size={18} color={theme.colors.textMuted} />}
                </td>
                <td style={{ padding: '12px 16px' }}><Badge variant="solid" color={TYPE_COLORS[e.type]}>{e.type}</Badge></td>
                <td style={{ padding: '12px 16px', fontFamily: theme.typography.serif, fontSize: '1.05rem', color: theme.colors.text }}>
                  <div dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {e.tags.slice(0, 2).map(t => <Badge key={t}>{t}</Badge>)}
                    {e.tags.length > 2 && (
                      <span 
                        title={e.tags.slice(2).join(', ')}
                        style={{ 
                          fontFamily: theme.typography.sans, 
                          fontSize: '0.65rem', 
                          color: theme.colors.textMuted,
                          alignSelf: 'center',
                          padding: '2px 4px'
                        }}
                      >
                        +{e.tags.length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: theme.colors.textDim, 
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 180,
                    opacity: e.versionNote === 'Initial version' || e.versionNote === 'Auto-saved' ? 0.5 : 0.8
                  }} title={e.versionNote || ''}>
                    {e.versionNote || '—'}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: theme.colors.textMuted, fontSize: '0.82rem' }}>{new Date(e.updatedAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                    <Button variant="ghost" size="sm" style={{ color: theme.colors.accent }} onClick={() => onEditEntry(e)} icon={<Pencil size={15} />} />
                    <Button variant="ghost" size="sm" style={{ color: theme.colors.danger }} onClick={() => onDeleteEntry(e.id)} icon={<Trash2 size={15} />} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

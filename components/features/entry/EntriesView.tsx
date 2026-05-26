'use client'

import React from 'react'
import { Pencil, Trash2, Library, Filter, ArrowUp, FileText } from 'lucide-react'
import { exportToPDF } from '@/components/features/pdf/PDFExport'
import { useAppContext, THEME_COLORS } from '@/lib/context/AppContext'
import { Button, Badge, Select } from '@/components/ui/Common'
import Pagination from '@/components/ui/Pagination'
import FilterBar from '@/components/ui/FilterBar'
import { theme } from '@/lib/core/theme'
import { renderTitle } from '@/lib/core/math'
import { Entry } from '@/types'
import { TYPE_COLORS, ENTRY_TYPES } from '@/lib/core/constants'
import { DataTable, Column } from '@/components/ui/DataTable'

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

export const EntriesView: React.FC<EntriesViewProps> = (props) => {
  const {
    entries, loading, search, itemsPerPage, setItemsPerPage, currentPage, setCurrentPage,
    selectedIds, setSelectedIds, onSelectEntry, onEditEntry, onDeleteEntry, onBulkDelete,
    sortConfig, onSort, showFilter, setShowFilter,
    activeTags, setActiveTags, activeTypes, setActiveTypes, activeTitles, setActiveTitles
  } = props

  const totalPages = Math.max(1, Math.ceil(entries.length / itemsPerPage))
  const paginated = entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const allTags = [...new Set(entries.flatMap(e => e.tags))].sort()
  const allTitles = [...new Set(entries.map(e => e.title))].sort()
  
  
  const { state: { themeMode, accentColor } } = useAppContext()
  const [showExportMenu, setShowExportMenu] = React.useState(false)

  const [showScrollTop, setShowScrollTop] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 300)
  }

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const columns: Column<Entry>[] = [
    {
      id: 'type',
      label: 'Type',
      width: 110,
      sortable: true,
      render: (e) => <Badge variant="solid" color={TYPE_COLORS[e.type]}>{e.type}</Badge>
    },
    {
      id: 'title',
      label: 'Title',
      width: '25%',
      sortable: true,
      render: (e) => (
        <div
          style={{ fontFamily: theme.typography.serif, fontSize: '1.05rem', color: theme.colors.text }}
          dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }}
        />
      )
    },
    {
      id: 'tags',
      label: 'Tags',
      width: '20%',
      render: (e) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {e.tags.slice(0, 2).map(t => <Badge key={t}>{t}</Badge>)}
          {e.tags.length > 2 && (
            <div style={{ position: 'relative', display: 'flex' }} className="more-tags-trigger">
              <span
                style={{ fontSize: '0.65rem', color: theme.colors.textMuted, alignSelf: 'center', padding: '2px 4px', cursor: 'help' }}
              >
                +{e.tags.length - 2} more
              </span>
              <div className="more-tags-tooltip" style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
                padding: '8px', borderRadius: 6, boxShadow: theme.shadows.lg,
                zIndex: 100, display: 'none', gap: 4, flexWrap: 'wrap', width: 'max-content', maxWidth: 200,
                marginBottom: 8
              }}>
                {e.tags.slice(2).map(t => <Badge key={t} style={{ fontSize: '0.6rem' }}>{t}</Badge>)}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'updatedAt',
      label: 'Last Update',
      width: 130,
      sortable: true,
      render: (e) => <span style={{ color: theme.colors.textMuted, fontSize: '0.82rem' }}>{new Date(e.updatedAt).toLocaleDateString()}</span>
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 100,
      align: 'center',
      render: (e) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }} onClick={ev => ev.stopPropagation()}>
          <Button variant="ghost-outline" size="sm" style={{ color: theme.colors.accent }} onClick={() => onEditEntry(e)} icon={<Pencil size={15} />} />
          <Button variant="ghost-outline" size="sm" style={{ color: theme.colors.danger }} onClick={() => onDeleteEntry(e.id)} icon={<Trash2 size={15} />} />
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
          <Library size={32} style={{ marginRight: 16 }} />
          {search ? `Search Results` : 'Knowledge Repository'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.9rem', color: theme.colors.textMuted }}>{entries.length} records</span>
          
          <div style={{ position: 'relative' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              icon={<FileText size={14} />}
            >
              Export All
            </Button>
            {showExportMenu && (
              <>
                <div
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                  onClick={() => setShowExportMenu(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 110,
                  background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
                  borderRadius: 12, padding: '8px 0', minWidth: 160, boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  animation: 'fadeIn 0.2s ease-out', overflow: 'hidden'
                }}>
                  <div
                    onClick={() => {
                      const colors = THEME_COLORS[accentColor]
                      const hex = themeMode === 'dark' ? colors.dark : colors.light
                      exportToPDF(entries, hex, themeMode);
                      setShowExportMenu(false);
                    }}
                    style={{
                      padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: theme.colors.text,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.colors.surfaceHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Export All as PDF
                  </div>
                  <div
                    onClick={() => { window.open('/api/export/json', '_self'); setShowExportMenu(false); }}
                    style={{
                      padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: theme.colors.text,
                      borderTop: `1px solid ${theme.colors.border}`, transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.colors.surfaceHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Export All as JSON
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={onBulkDelete} icon={<Trash2 size={16} />}>
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button variant={showFilter ? 'gold' : 'outline'} onClick={() => setShowFilter(!showFilter)} icon={<Filter size={18} />}>
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
        onResetAll={() => { setActiveTags(new Set()); setActiveTypes(new Set()); setActiveTitles(new Set()); }}
        columns={[
          { id: 'type', label: 'Type', options: ENTRY_TYPES, activeValues: activeTypes, onToggle: setActiveTypes },
          { id: 'title', label: 'Title', options: allTitles, activeValues: activeTitles, onToggle: setActiveTitles },
          { id: 'tags', label: 'Tags', options: allTags, activeValues: activeTags, onToggle: setActiveTags, style: 'tag' },
        ]}
      />

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        onRowClick={onSelectEntry}
        sortConfig={sortConfig}
        onSort={onSort}
        selectedIds={selectedIds}
        onSelectIds={(ids: any) => setSelectedIds(ids)}
        getRowId={(e) => e.id}
      />

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

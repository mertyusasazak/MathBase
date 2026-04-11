'use client'

import React from 'react'
import { Square, CheckSquare, ArrowUp, ArrowDown } from 'lucide-react'
import { theme } from '@/lib/core/theme'

export interface Column<T> {
  id: string
  label: string
  width?: string | number
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  render: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string

  // Selection
  selectedIds?: Set<string | number>
  onSelectIds?: (ids: Set<string | number>) => void
  getRowId: (item: T) => string | number

  // Sorting
  sortConfig?: { key: string; direction: 'asc' | 'desc' | null }
  onSort?: (key: string) => void

  // Interaction
  onRowClick?: (item: T) => void
}

export function DataTable<T>({
  data,
  columns,
  loading,
  emptyMessage = 'No records found.',
  selectedIds,
  onSelectIds,
  getRowId,
  sortConfig,
  onSort,
  onRowClick
}: DataTableProps<T>) {

  const handleSelectAll = () => {
    if (!onSelectIds) return
    const ids = data.map(getRowId)
    if (ids.every(id => selectedIds?.has(id))) {
      const next = new Set(selectedIds)
      ids.forEach(id => next.delete(id))
      onSelectIds(next)
    } else {
      const next = new Set(selectedIds)
      ids.forEach(id => next.add(id))
      onSelectIds(next)
    }
  }

  const handleSelectRow = (e: React.MouseEvent, item: T) => {
    if (!onSelectIds) return
    e.stopPropagation()
    const id = getRowId(item)
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    onSelectIds(next)
  }

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key || !sortConfig?.direction) return null
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={12} style={{ marginLeft: 4, display: 'inline' }} />
      : <ArrowDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
  }

  const tableHeaderStyle = (col: Column<T>): React.CSSProperties => ({
    padding: '16px',
    fontFamily: theme.typography.sans,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: theme.colors.textMuted,
    fontWeight: 700,
    cursor: col.sortable ? 'pointer' : 'default',
    userSelect: 'none',
    textAlign: col.align || 'left',
    width: col.width
  })

  return (
    <div style={{
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: 12,
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.surfaceHover }}>
            {onSelectIds && (
              <th style={{ ...tableHeaderStyle({ id: 'select', label: '', width: 50, render: () => null }), textAlign: 'left', cursor: 'pointer' }} onClick={handleSelectAll}>
                {data.length > 0 && data.every(item => selectedIds?.has(getRowId(item)))
                  ? <CheckSquare size={18} color={theme.colors.accent} />
                  : <Square size={18} color={theme.colors.textMuted} />}
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.id}
                style={tableHeaderStyle(col)}
                onClick={() => col.sortable && onSort?.(col.label)}
              >
                {col.label} {col.sortable && renderSortIcon(col.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ background: theme.colors.background }}>
          {loading ? (
            <tr><td colSpan={columns.length + (onSelectIds ? 1 : 0)} style={{ padding: 48, textAlign: 'center' }}>Loading...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length + (onSelectIds ? 1 : 0)} style={{ padding: 48, textAlign: 'center' }}>{emptyMessage}</td></tr>
          ) : data.map((item, idx) => {
            const id = getRowId(item)
            const isSelected = selectedIds?.has(id)

            return (
              <tr
                key={String(id)}
                onClick={() => onRowClick?.(item)}
                className="row-hover-group"
                style={{
                  borderBottom: `1px solid ${theme.colors.border}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: theme.animations.fast,
                  background: isSelected ? `${theme.colors.accent}08` : 'transparent'
                }}
              >
                {onSelectIds && (
                  <td style={{ padding: '12px 16px' }} onClick={e => handleSelectRow(e, item)}>
                    {isSelected ? <CheckSquare size={18} color={theme.colors.accent} /> : <Square size={18} color={theme.colors.textMuted} />}
                  </td>
                )}
                {columns.map(col => (
                  <td
                    key={col.id}
                    style={{
                      padding: '12px 16px',
                      textAlign: col.align || 'left',
                      verticalAlign: 'middle'
                    }}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

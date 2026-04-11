'use client'

import React, { useState, useEffect } from 'react'
import { Search, X, Check, Filter as FilterIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { theme } from '@/lib/core/theme'
import { Button, Input } from '@/components/ui/Common'
import Card from '@/components/ui/Card'

export interface FilterColumn {
  id: string
  label: string
  options: string[]
  activeValues: Set<string>
  onToggle: (values: Set<string>) => void
  style?: 'tag' | 'default'
  renderOption?: (option: string) => React.ReactNode
}

interface FilterBarProps {
  columns: FilterColumn[]
  isVisible: boolean
  onClose: () => void
  onResetAll?: () => void
}

export default function FilterBar({
  columns,
  isVisible,
  onClose,
  onResetAll,
}: FilterBarProps) {
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Close detail view when bar is hidden
  useEffect(() => {
    if (!isVisible) {
      setActiveColumnId(null)
      setSearchQuery('')
    }
  }, [isVisible])

  if (!isVisible) return null

  const activeColumn = columns.find(c => c.id === activeColumnId)
  const totalActive = columns.reduce((acc, col) => acc + col.activeValues.size, 0)

  return (
    <Card
      variant="outline"
      padding={0}
      style={{
        marginBottom: 16,
        animation: `slideDown ${theme.animations.normal}`,
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Column Headers Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: activeColumnId ? `1px solid ${theme.colors.border}` : 'none',
        gap: 8,
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginRight: 16,
          color: theme.colors.accent,
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: theme.typography.sans
        }}>
          <FilterIcon size={14} />
          <span>Filters:</span>
        </div>

        {columns.map(col => (
          <Button
            key={col.id}
            variant={activeColumnId === col.id ? 'gold' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveColumnId(activeColumnId === col.id ? null : col.id)
              setSearchQuery('')
            }}
            style={{ borderRadius: 20, padding: '4px 14px' }}
            icon={activeColumnId === col.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            iconPosition="right"
          >
            {col.label}
            {col.activeValues.size > 0 && (
              <span style={{
                background: theme.colors.accent,
                color: theme.colors.background,
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 800,
                marginLeft: 4
              }}>
                {col.activeValues.size}
              </span>
            )}
          </Button>
        ))}

        <div style={{ flex: 1 }} />

        {totalActive > 0 && onResetAll && (
          <Button variant="ghost" size="sm" onClick={() => { onResetAll(); setActiveColumnId(null); }} style={{ color: theme.colors.danger, textDecoration: 'underline' }}>
            Reset All
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={18} />} style={{ padding: 4 }} />
      </div>

      {/* Detail Search & Options Area */}
      {activeColumn && (
        <div style={{ padding: '20px', background: `${theme.colors.surfaceHover}55` }}>
          <div style={{ marginBottom: 16 }}>
            <Input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search within ${activeColumn.label.toLowerCase()}...`}
              icon={<Search size={16} />}
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 250,
            overflowY: 'auto',
            paddingRight: 8
          }}>
            {activeColumn.options
              .filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(opt => {
                const isSelected = activeColumn.activeValues.has(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      const next = new Set(activeColumn.activeValues)
                      if (isSelected) next.delete(opt); else next.add(opt)
                      activeColumn.onToggle(next)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isSelected ? `${theme.colors.accent}15` : 'transparent',
                      border: '1px solid transparent',
                      borderColor: isSelected ? `${theme.colors.accent}33` : 'transparent',
                      color: isSelected ? theme.colors.text : theme.colors.textMuted,
                      fontSize: '0.9rem',
                      fontFamily: activeColumn.style === 'tag' ? theme.typography.sans : theme.typography.serif,
                      cursor: 'pointer',
                      transition: theme.animations.fast,
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = theme.colors.surfaceHover
                        e.currentTarget.style.color = theme.colors.text
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = theme.colors.textMuted
                      }
                    }}
                  >
                    <div style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      border: `1.5px solid ${isSelected ? theme.colors.accent : theme.colors.border}`,
                      borderRadius: 4,
                      background: isSelected ? theme.colors.accent : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: theme.animations.fast
                    }}>
                      {isSelected && <Check size={12} color={theme.colors.background} strokeWidth={3} />}
                    </div>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeColumn.renderOption ? activeColumn.renderOption(opt) : (activeColumn.style === 'tag' ? `#${opt}` : opt)}
                    </span>
                  </button>
                )
              })
            }
            {activeColumn.options.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: theme.colors.textMuted, fontSize: '0.85rem' }}>
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

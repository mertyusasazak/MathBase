// components/features/entries/FilterDropdown.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Filter, ChevronLeft, Search, X, Check, ArrowRight } from 'lucide-react'

interface FilterDropdownProps {
  allTags: string[]
  ENTRY_TYPES: string[]
  TYPE_COLORS: Record<string, string>
  activeTags: Set<string>
  activeTypes: Set<string>
  setActiveTags: (tags: Set<string>) => void
  setActiveTypes: (types: Set<string>) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

type FilterView = 'main' | 'type' | 'tags'

export default function FilterDropdown({
  allTags,
  ENTRY_TYPES,
  TYPE_COLORS,
  activeTags,
  activeTypes,
  setActiveTags,
  setActiveTypes,
  isOpen,
  setIsOpen,
}: FilterDropdownProps) {
  const [view, setView] = useState<FilterView>('main')
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  // Reset view when opening
  useEffect(() => {
    if (isOpen) {
      setView('main')
      setSearchQuery('')
    }
  }, [isOpen])

  const totalActive = activeTags.size + activeTypes.size

  const renderMainView = () => (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a7870', marginBottom: 4 }}>Filter by category</div>
      
      <button 
        onClick={() => setView('type')}
        style={categoryButtonStyle}
        onMouseEnter={e => { e.currentTarget.style.background = '#1e1e24'; e.currentTarget.style.borderColor = '#c9a84c55'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#16161a'; e.currentTarget.style.borderColor = '#2a2a33'; }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.95rem', fontWeight: 600, color: '#e8e6df' }}>Entry Type</span>
          <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: '#7a7870' }}>{activeTypes.size > 0 ? `${activeTypes.size} selected` : 'All types'}</span>
        </div>
        <ArrowRight size={18} color="#c9a84c" />
      </button>

      <button 
        onClick={() => setView('tags')}
        style={categoryButtonStyle}
        onMouseEnter={e => { e.currentTarget.style.background = '#1e1e24'; e.currentTarget.style.borderColor = '#c9a84c55'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#16161a'; e.currentTarget.style.borderColor = '#2a2a33'; }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.95rem', fontWeight: 600, color: '#e8e6df' }}>Tags</span>
          <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: '#7a7870' }}>{activeTags.size > 0 ? `${activeTags.size} selected` : 'All tags'}</span>
        </div>
        <ArrowRight size={18} color="#c9a84c" />
      </button>

      {totalActive > 0 && (
        <button 
          onClick={() => { setActiveTags(new Set()); setActiveTypes(new Set()); }}
          style={{ marginTop: 8, background: 'transparent', border: '1px solid #c96b6b44', borderRadius: 8, padding: '10px', color: '#c96b6b', fontSize: '0.8rem', fontFamily: 'Instrument Sans', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#c96b6b11'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  const renderDetailView = (title: string, options: string[], activeSet: Set<string>, setter: (s: Set<string>) => void, colors?: Record<string, string>) => {
    const filteredOptions = options.filter(o => o.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 450 }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a33', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setView('main'); setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: '#7a7870', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#c9a84c'} onMouseLeave={e => e.currentTarget.style.color = '#7a7870'}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.9rem', fontWeight: 700, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
          {activeSet.size > 0 && (
            <button onClick={() => setter(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#7a7870', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a33' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7a7870' }} />
            <input 
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              style={{ width: '100%', background: '#16161a', border: '1px solid #2a2a33', borderRadius: 6, padding: '8px 12px 8px 32px', color: '#e8e6df', fontSize: '0.85rem', fontFamily: 'Instrument Sans', outline: 'none' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#7a7870', fontSize: '0.8rem', fontFamily: 'Instrument Sans' }}>No results found</div>
          ) : (
            filteredOptions.map(opt => {
              const isSelected = activeSet.has(opt)
              return (
                <div 
                  key={opt}
                  onClick={() => {
                    const next = new Set(activeSet)
                    if (isSelected) next.delete(opt); else next.add(opt)
                    setter(next)
                  }}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', 
                    borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
                    background: isSelected ? 'rgba(201, 168, 76, 0.1)' : 'transparent'
                  }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#1e1e24')}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ 
                    width: 18, height: 18, border: `1.5px solid ${isSelected ? '#c9a84c' : '#33333a'}`, 
                    borderRadius: 4, background: isSelected ? '#c9a84c' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                  }}>
                    {isSelected && <Check size={12} color="#16161a" strokeWidth={3} />}
                  </div>
                  <span style={{ 
                    fontFamily: title === 'Tags' ? 'Instrument Sans' : 'EB Garamond, serif', 
                    fontSize: title === 'Tags' ? '0.85rem' : '1.05rem', 
                    color: colors ? colors[opt] : (isSelected ? '#e8e6df' : '#b8b5ae')
                  }}>
                    {title === 'Tags' ? `#${opt}` : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-base btn-outline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 18px',
          fontSize: '0.9rem',
          borderRadius: 8,
          background: isOpen ? '#1e1e24' : 'transparent',
          borderColor: isOpen ? '#c9a84c' : '#2a2a33',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Filter size={16} color={totalActive > 0 ? '#c9a84c' : '#7a7870'} />
        <span style={{ color: isOpen ? '#e8e6df' : (totalActive > 0 ? '#e8e6df' : '#b8b5ae') }}>Filter</span>
        {totalActive > 0 && (
          <span style={{
            background: '#c9a84c',
            color: '#16161a',
            borderRadius: '50%',
            minWidth: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 800,
            marginLeft: 4
          }}>
            {totalActive}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 48,
          left: 0,
          zIndex: 1000,
          background: '#16161a',
          border: '1px solid #2a2a33',
          borderRadius: 12,
          width: 400,
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          animation: 'slideUpTransition 0.2s ease-out'
        }}>
          <style>{`
            @keyframes slideUpTransition {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          
          {view === 'main' && renderMainView()}
          {view === 'type' && renderDetailView('Entry Type', ENTRY_TYPES, activeTypes, setActiveTypes, TYPE_COLORS)}
          {view === 'tags' && renderDetailView('Tags', allTags, activeTags, setActiveTags)}
        </div>
      )}
    </div>
  )
}

const categoryButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  background: '#16161a',
  border: '1px solid #2a2a33',
  borderRadius: 10,
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  width: '100%',
  outline: 'none'
}

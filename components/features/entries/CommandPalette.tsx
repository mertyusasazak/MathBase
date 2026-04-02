'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, BookOpen, Sparkles, Plus, Network, Trash2 } from 'lucide-react'
import { renderTitle } from '@/lib/core/math'
import { EntryOption as Entry, SourceOption as Source } from '@/types'


interface CommandPaletteProps {
    entries: Entry[]
    sources: Source[]
    onClose: () => void
    goToView: (view: 'dashboard' | 'entries' | 'graph' | 'sources' | 'deleted') => void
    selectEntry: (id: number) => void
    onNewEntry: () => void
}

type ResultItem =
    | { type: 'entry'; data: Entry }
    | { type: 'source'; data: Source }
    | { type: 'action'; label: string; action: () => void; icon: React.ReactNode }

export default function CommandPalette({ entries, sources, onClose, goToView, selectEntry, onNewEntry }: CommandPaletteProps) {
    const [search, setSearch] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const actions = [
        { label: 'Create New Entry', action: () => { onClose(); onNewEntry(); }, icon: <Plus size={16} /> },
        { label: 'Open Graph View', action: () => { onClose(); goToView('graph'); }, icon: <Network size={16} /> },
        { label: 'View All Sources', action: () => { onClose(); goToView('sources'); }, icon: <BookOpen size={16} /> },
        { label: 'View Trash', action: () => { onClose(); goToView('deleted'); }, icon: <Trash2 size={16} /> },
    ]

    const s = search.toLowerCase()
    const filteredEntries = s ? entries.filter(e => e.title.toLowerCase().includes(s) || e.tags.some(t => t.toLowerCase().includes(s))).slice(0, 5) : []
    const filteredSources = s ? sources.filter(src => src.title.toLowerCase().includes(s)).slice(0, 3) : []
    const filteredActions = actions.filter(a => a.label.toLowerCase().includes(s))

    const results: ResultItem[] = [
        ...filteredEntries.map(e => ({ type: 'entry' as const, data: e })),
        ...filteredSources.map(s => ({ type: 'source' as const, data: s })),
        ...filteredActions.map(a => ({ type: 'action' as const, ...a }))
    ]

    // If no search, show some default actions
    if (!s && results.length === 0) {
        results.push(...actions.slice(0, 4).map(a => ({ type: 'action' as const, ...a })))
    }

    useEffect(() => {
        setSelectedIndex(0)
    }, [search])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault()
            handleSelect(results[selectedIndex])
        }
    }

    const handleSelect = (item: ResultItem) => {
        if (item.type === 'entry') {
            selectEntry(item.data.id)
            onClose()
        } else if (item.type === 'source') {
            goToView('sources')
            onClose()
        } else if (item.type === 'action') {
            item.action()
        }
    }

    // Scroll active item into view
    useEffect(() => {
        if (listRef.current) {
            const activeEl = listRef.current.children[selectedIndex] as HTMLElement
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [selectedIndex])

    // Grouping for render
    const renderItem = (item: ResultItem, index: number) => {
        const isActive = index === selectedIndex
        const baseStyle: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            cursor: 'pointer', borderRadius: 8,
            background: isActive ? '#2a2a33' : 'transparent',
            transition: 'background 0.1s'
        }

        if (item.type === 'entry') {
            return (
                <div key={`entry-${item.data.id}`} style={baseStyle} onClick={() => handleSelect(item)} onMouseEnter={() => setSelectedIndex(index)}>
                    <FileText size={16} color="#c9a84c" />
                    <span style={{ fontFamily: 'EB Garamond', fontSize: '1.1rem', color: '#e8e6df' }} dangerouslySetInnerHTML={{ __html: renderTitle(item.data.title) }} />
                    <span style={{ marginLeft: 'auto', fontFamily: 'Instrument Sans', fontSize: '0.65rem', color: '#7a7870', textTransform: 'uppercase', background: '#16161a', padding: '2px 6px', borderRadius: 4 }}>Entry</span>
                </div>
            )
        }

        if (item.type === 'source') {
            return (
                <div key={`source-${item.data.id}`} style={baseStyle} onClick={() => handleSelect(item)} onMouseEnter={() => setSelectedIndex(index)}>
                    <BookOpen size={16} color="#7eb8b0" />
                    <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.9rem', color: '#e8e6df' }}>{item.data.title}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Instrument Sans', fontSize: '0.65rem', color: '#7a7870', textTransform: 'uppercase', background: '#16161a', padding: '2px 6px', borderRadius: 4 }}>Source</span>
                </div>
            )
        }

        if (item.type === 'action') {
            return (
                <div key={`action-${item.label}`} style={baseStyle} onClick={() => handleSelect(item)} onMouseEnter={() => setSelectedIndex(index)}>
                    <div style={{ color: '#b8b5ae' }}>{item.icon}</div>
                    <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.9rem', color: '#e8e6df' }}>{item.label}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Instrument Sans', fontSize: '0.65rem', color: '#7a7870', textTransform: 'uppercase', background: '#16161a', padding: '2px 6px', borderRadius: 4 }}>Action</span>
                </div>
            )
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '10vh', animation: 'fadeIn 0.2s ease'
        }} onClick={onClose}>
            <div style={{
                width: '100%', maxWidth: 600, background: '#16161a', border: '1px solid #2a2a33',
                borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>

                {/* Search Input */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2a2a33' }}>
                    <Search size={20} color="#7a7870" />
                    <input
                        ref={inputRef}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or search..."
                        style={{
                            flex: 1, background: 'transparent', border: 'none', color: '#e8e6df',
                            fontSize: '1.1rem', fontFamily: 'Instrument Sans', outline: 'none', marginLeft: 12
                        }}
                    />
                    <button onClick={onClose} style={{ background: '#1e1e24', border: '1px solid #2a2a33', borderRadius: 4, color: '#7a7870', padding: '2px 6px', fontSize: '0.7rem', fontFamily: 'JetBrains Mono', cursor: 'pointer' }}>ESC</button>
                </div>

                {/* Results */}
                <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {results.length > 0 ? results.map((item, index) => renderItem(item, index)) : (
                        <div style={{ padding: 24, textAlign: 'center', color: '#7a7870', fontFamily: 'Instrument Sans', fontSize: '0.9rem' }}>
                            No results found.
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

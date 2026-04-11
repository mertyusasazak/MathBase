'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useMathBase } from '@/hooks/useMathBase'
import { Entry } from '@/types'

export const THEME_COLORS = {
  gold: { dark: '#c9a84c', light: '#866619' }, // Darker gold for light mode
  indigo: { dark: '#818cf8', light: '#3730a3' }, // Darker indigo
  emerald: { dark: '#34d399', light: '#065f46' }, // Darker emerald
  rose: { dark: '#fb7185', light: '#9f1239' }, // Darker rose
  cyan: { dark: '#22d3ee', light: '#155e75' }, // Darker cyan
  violet: { dark: '#a78bfa', light: '#5b21b6' } // Darker violet
}

export type AccentColor = keyof typeof THEME_COLORS

export function useAppController() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const {
    entries, sources, relations, deletedItems, loading,
    handleDelete, handleRestore, handlePermanentDelete, refreshAll, loadEntries, loadSources, loadRelations, loadDeleted
  } = useMathBase()

  const [activeView, setActiveView] = useState<'dashboard' | 'entries' | 'graph' | 'entry' | 'sources' | 'deleted'>(
    (searchParams.get('view') as any) || 'dashboard'
  )
  const [selected, setSelected] = useState<Entry | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')
  const [accentColor, setAccentColor] = useState<AccentColor>('gold')

  const [editorKey, setEditorKey] = useState(0)

  // Filters & Pagination
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [activeTitles, setActiveTitles] = useState<Set<string>>(new Set())
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletedPage, setDeletedPage] = useState(1)
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set())
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null })

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Theme Sync
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setThemeMode(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    }
    const savedColor = localStorage.getItem('accentColor') as AccentColor | null
    if (savedColor && THEME_COLORS[savedColor]) {
      setAccentColor(savedColor)
    }
  }, [])

  useEffect(() => {
    const colors = THEME_COLORS[accentColor]
    const hex = themeMode === 'dark' ? colors.dark : colors.light
    document.documentElement.style.setProperty('--accent', hex)
    document.documentElement.style.setProperty('--accent-muted', `${hex}22`)
    document.documentElement.style.setProperty('--accent-dark', hex) // Simplified fallback
  }, [themeMode, accentColor])

  const toggleTheme = useCallback(() => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }, [themeMode])

  const changeAccentColor = useCallback((color: AccentColor) => {
    setAccentColor(color)
    localStorage.setItem('accentColor', color)
  }, [])

  // URL Sync
  useEffect(() => {
    const viewParam = searchParams.get('view') as any
    const entryParam = searchParams.get('entry')
    if (entryParam && entries.length > 0) {
      const entry = entries.find(e => e.id === parseInt(entryParam))
      if (entry) { 
        setSelected(entry)
        setActiveView('entry')
        setMode('view') 
      }
    } else if (viewParam) { 
      setActiveView(viewParam)
      setSelected(null)
      setMode('view') 
    } else {
      setSelected(null)
      setMode('view')
    }
  }, [searchParams, entries])



  const goToUrl = useCallback((params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    Object.entries(params).forEach(([key, value]) => { 
      if (value === null) current.delete(key)
      else current.set(key, value) 
    })
    router.push(`${pathname}?${current.toString()}`)
  }, [searchParams, router, pathname])

  const goToView = (view: any) => { goToUrl({ view, entry: null }) }
  const selectEntry = (e: Entry) => { goToUrl({ entry: e.id.toString() }) }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc'
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc'
      else if (sortConfig.direction === 'desc') direction = null
    }
    setSortConfig({ key, direction })
  }

  const handleSave = async (entry: any, versionNote?: string) => {
    const method = entry.id ? 'PUT' : 'POST'
    const res = await fetch(entry.id ? `/api/entries/${entry.id}` : '/api/entries', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...entry, versionNote })
    })
    const saved = await res.json()
    await refreshAll()
    setSelected(saved)
    setMode('view')
  }

  const handleBulkDelete = async () => {
    if (selectedEntryIds.size === 0) return
    if (!confirm(`Trash ${selectedEntryIds.size} entries?`)) return
    await fetch('/api/entries/bulk', { 
      method: 'DELETE', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ids: Array.from(selectedEntryIds) }) 
    })
    setSelectedEntryIds(new Set())
    await refreshAll()
  }

  const handleBulkRestoreDeleted = async () => {
    if (selectedDeletedIds.size === 0) return
    const keys = Array.from(selectedDeletedIds)
    for (const key of keys) {
      const [type, id] = key.split('-')
      const item = deletedItems.find(i => i.deletedItemType === type && i.id === parseInt(id))
      console.log('Restoring', item) // Placeholder logic, should use handleRestore from base hook
    }
    setSelectedDeletedIds(new Set())
    await refreshAll()
  }

  const handleBulkPermanentDelete = async () => {
    if (selectedDeletedIds.size === 0) return
    if (!confirm(`Permanently delete ${selectedDeletedIds.size} items?`)) return
    const keys = Array.from(selectedDeletedIds)
    for (const key of keys) {
      const [type, id] = key.split('-')
      // Placeholder logic for bulk permanent delete
    }
    setSelectedDeletedIds(new Set())
    await refreshAll()
  }

  const handleDeleteAllPermanently = async () => {
    if (!confirm('Permanently delete ALL items in trash?')) return
    await fetch('/api/entries/permanent-all', { method: 'DELETE' })
    await refreshAll()
  }



  // Filtering processed data
  const filtered = entries.filter(e => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const match = 
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        e.type.toLowerCase().includes(q) ||
        e.symbolKeywords?.some(k => k.toLowerCase().includes(q))
      
      if (!match) return false
    }

    if (activeTags.size > 0 && !e.tags.some(t => activeTags.has(t))) return false
    if (activeTypes.size > 0 && !activeTypes.has(e.type)) return false
    if (activeTitles.size > 0 && !activeTitles.has(e.title)) return false
    return true
  })

  if (sortConfig.direction) {
    filtered.sort((a, b) => {
      const valA = sortConfig.key === 'Title' ? a.title : a.type
      const valB = sortConfig.key === 'Title' ? b.title : b.type
      return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
  }

  return {
    state: {
      entries, sources, relations, deletedItems, loading,
      activeView, selected, mode, sidebarOpen, search, editorKey, themeMode, accentColor,
      activeTags, activeTypes, activeTitles, showFilterDropdown, itemsPerPage, currentPage, deletedPage,
      selectedEntryIds, selectedDeletedIds, sortConfig, filtered
    },
    refs: { searchInputRef },
    actions: {
      setActiveView, setSelected, setMode, setSidebarOpen, setSearch, setEditorKey, toggleTheme, changeAccentColor,
      setActiveTags, setActiveTypes, setActiveTitles, setShowFilterDropdown, setItemsPerPage, setCurrentPage, setDeletedPage,
      setSelectedEntryIds, setSelectedDeletedIds, 
      goToView, selectEntry, handleSort, handleSave, handleBulkDelete, handleBulkRestoreDeleted, 
      handleBulkPermanentDelete, handleDeleteAllPermanently, refreshAll, handleDelete, handleRestore, handlePermanentDelete
    }
  }
}

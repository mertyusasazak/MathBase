'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useMathBase } from '@/hooks/useMathBase'
import { Entry } from '@/types'

export const THEME_COLORS = {
  gold: { dark: '#c9a84c', light: '#725712' },
  lilac: { dark: '#a78bfa', light: '#6d28d9' },
  burgundy: { dark: '#ef4444', light: '#7f1d1d' },
  blue: { dark: '#38bdf8', light: '#0284c7' },
  pink: { dark: '#f472b6', light: '#be185d' },
  orange: { dark: '#fb923c', light: '#c2410c' }
}

export type AccentColor = keyof typeof THEME_COLORS

interface AppContextType {
  state: any
  refs: any
  actions: any
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const {
    entries, sources, relations, deletedItems, loading,
    handleDelete, handleRestore, handlePermanentDelete, refreshAll, loadEntries, loadSources, loadRelations, loadDeleted
  } = useMathBase()

  // Derived activeView from pathname for better routing sync
  const activeView = pathname === '/dashboard' ? 'dashboard' :
    pathname === '/entry' ? 'entry' :
      pathname === '/graph' ? 'graph' :
        pathname === '/sources' ? 'sources' :
          pathname === '/trash' ? 'deleted' :
    pathname.startsWith('/entry') ? 'entry' :
      pathname === '/new' ? 'entry' :
        pathname.startsWith('/edit') ? 'entry' : 'dashboard'

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
    document.documentElement.style.setProperty('--accent-dark', hex)
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

  const goToView = useCallback((view: string) => {
    if (view === 'dashboard' || view === 'entry' || view === 'graph' || view === 'sources' || view === 'deleted') {
      router.push(`/${view === 'deleted' ? 'trash' : view}`)
    } else {
      router.push(`/${view}`)
    }
  }, [router])

  const selectEntry = useCallback((e: Entry) => {
    router.push(`/entry/${e.id}`)
  }, [router])

  const editEntry = useCallback((id: number) => {
    router.push(`/edit/${id}`)
  }, [router])

  const newEntry = useCallback(() => {
    setEditorKey(k => k + 1)
    router.push('/new')
  }, [router])

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
    const res = await fetch(entry.id ? `/api/entry/${entry.id}` : '/api/entry', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...entry, versionNote })
    })
    const saved = await res.json()
    await refreshAll()
    setSelected(saved)
    setMode('view')
    router.push('/entry')
  }

  const handleBulkDelete = async () => {
    if (selectedEntryIds.size === 0) return
    if (!confirm(`Trash ${selectedEntryIds.size} entry?`)) return
    await fetch('/api/entry/bulk', {
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
      // Placeholder for actual restore logic
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
    }
    setSelectedDeletedIds(new Set())
    await refreshAll()
  }

  const handleDeleteAllPermanently = async () => {
    if (!confirm('Permanently delete ALL items in trash?')) return
    await fetch('/api/entry/permanent-all', { method: 'DELETE' })
    await refreshAll()
  }

  const filtered = entries.filter(e => {
    if (search.trim()) {
      const q = search.toLowerCase()
      let match = false
      
      if (q.startsWith('t:') || q.startsWith('title:')) {
        const query = q.startsWith('t:') ? q.slice(2).trim() : q.slice(6).trim()
        match = e.title.toLowerCase().includes(query)
      } else if (q.startsWith('#') || q.startsWith('tag:')) {
        const query = q.startsWith('#') ? q.slice(1).trim() : q.slice(4).trim()
        match = e.tags.some(t => t.toLowerCase().includes(query))
      } else {
        match =
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags.some(t => t.toLowerCase().includes(q)) ||
          e.type.toLowerCase().includes(q) ||
          e.symbolKeywords?.some(k => k.toLowerCase().includes(q))
      }

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

  const value = {
    state: {
      entries, sources, relations, deletedItems, loading,
      activeView, selected, mode, sidebarOpen, search, editorKey, themeMode, accentColor,
      activeTags, activeTypes, activeTitles, showFilterDropdown, itemsPerPage, currentPage, deletedPage,
      selectedEntryIds, selectedDeletedIds, sortConfig, filtered
    },
    refs: { searchInputRef },
    actions: {
      setSelected, setMode, setSidebarOpen, setSearch, setEditorKey, toggleTheme, changeAccentColor,
      setActiveTags, setActiveTypes, setActiveTitles, setShowFilterDropdown, setItemsPerPage, setCurrentPage, setDeletedPage,
      setSelectedEntryIds, setSelectedDeletedIds,
      goToView, selectEntry, editEntry, newEntry, handleSort, handleSave, handleBulkDelete, handleBulkRestoreDeleted,
      handleBulkPermanentDelete, handleDeleteAllPermanently, refreshAll, handleDelete, handleRestore, handlePermanentDelete
    }
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within an AppProvider')
  return context
}

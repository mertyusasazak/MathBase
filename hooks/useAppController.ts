'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useMathBase } from '@/hooks/useMathBase'
import { Entry } from '@/types'

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
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text')

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
      setMode('view') 
    }
  }, [searchParams, entries])

  // Debounced Search Logic
  useEffect(() => {
    if (!search.trim()) { 
      // loadEntries(); 
      return 
    }
    const t = setTimeout(async () => {
      // Logic for search placeholder - in a real app, this updates the entry list
      // await fetch(`/api/search?q=${encodeURIComponent(search)}&mode=${searchMode}`)
    }, 300)
    return () => clearTimeout(t)
  }, [search, searchMode])

  const goToUrl = useCallback((params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    Object.entries(params).forEach(([key, value]) => { 
      if (value === null) current.delete(key)
      else current.set(key, value) 
    })
    router.push(`${pathname}?${current.toString()}`)
  }, [searchParams, router, pathname])

  const goToView = (view: any) => { goToUrl({ view, entry: null }) }
  const selectEntry = (e: Entry) => { goToUrl({ entry: e.id.toString(), view: null }) }

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
      activeView, selected, mode, sidebarOpen, search, searchMode, editorKey,
      activeTags, activeTypes, activeTitles, showFilterDropdown, itemsPerPage, currentPage, deletedPage,
      selectedEntryIds, selectedDeletedIds, sortConfig, filtered
    },
    refs: { searchInputRef },
    actions: {
      setActiveView, setSelected, setMode, setSidebarOpen, setSearch, setSearchMode, setEditorKey,
      setActiveTags, setActiveTypes, setActiveTitles, setShowFilterDropdown, setItemsPerPage, setCurrentPage, setDeletedPage,
      setSelectedEntryIds, setSelectedDeletedIds, 
      goToView, selectEntry, handleSort, handleSave, handleBulkDelete, handleBulkRestoreDeleted, 
      handleBulkPermanentDelete, handleDeleteAllPermanently, refreshAll, handleDelete, handleRestore, handlePermanentDelete
    }
  }
}

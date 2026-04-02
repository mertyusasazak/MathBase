'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { exportToPDF } from '@/components/features/pdf/PDFExport'
import { renderTitle, renderContent } from '@/lib/core/math'
import Sidebar from '@/components/layout/Sidebar'
import Pagination from '@/components/ui/Pagination'
import CommandPalette from '@/components/features/entries/CommandPalette'
import FilterDropdown from '@/components/features/entries/FilterDropdown'
import { Entry, Source, Relation } from '@/types'
import {
  PanelLeft, Sparkles, Pencil, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, ArrowLeft,
  Menu,
  BookOpen,
  FileUp,
  Square,
  CheckSquare,
  Trash2,
  RotateCcw,
  Library,
  X,
  Key,
  Link2,
  Tag,
  FileText,
  Filter,
  ArrowUp,
  ArrowDown,
  Search
} from 'lucide-react'

// --- GLOBAL STYLES & CONSTANTS ---
const globalButtonStyles = `
  .btn-base {
    font-family: 'Instrument Sans', sans-serif;
    border-radius: 6px;
    padding: 6px 14px;
    cursor: pointer;
    background: transparent;
    transition: all 0.2s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .btn-gold { border: 1px solid #c9a84c; color: #c9a84c; }
  .btn-gold:hover { background: #c9a84c; color: #16161a; }
  .btn-gold:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-gold-solid { border: 1px solid #c9a84c; color: #16161a; background: #c9a84c; }
  .btn-gold-solid:hover { background: #b8972f; border-color: #b8972f; }
  .btn-gold-solid:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-red { border: 1px solid #c96b6b; color: #c96b6b; }
  .btn-red:hover { background: #c96b6b; color: #fff; }

  .btn-green { border: 1px solid #7eb8b0; color: #7eb8b0; }
  .btn-green:hover { background: #7eb8b0; color: #16161a; }

  .btn-outline { border: 1px solid #2a2a33; color: #e8e6df; }
  .btn-outline:hover { background: #e8e6df; color: #16161a; }
  .btn-outline:active {
    background: rgba(42, 42, 51, 0.5);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .skeleton-row {
    background: linear-gradient(90deg, #1e1e24 25%, #2a2a33 50%, #1e1e24 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    height: 18px;
    width: 100%;
  }

  input[type=number].no-spinners::-webkit-inner-spin-button, 
  input[type=number].no-spinners::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
  .btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-active { background: #c9a84c; color: #16161a; border: 1px solid #c9a84c; }

  .icon-btn { padding: 6px; border-radius: 6px; background: transparent; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .icon-btn:hover { background: #2a2a33; }
  .icon-btn-gold { color: #c9a84c; }
  .icon-btn-gold:hover { border-color: #c9a84c; }
  .icon-btn-red { color: #c96b6b; }
  .icon-btn-red:hover { border-color: #c96b6b; }
  .icon-btn-green { color: #7eb8b0; }
  .icon-btn-green:hover { border-color: #7eb8b0; }

  .search-toggle-container { position: relative; display: flex; background: #16161a; padding: 2px; border-radius: 40px; border: 1px solid #2a2a33; height: 28px; width: 160px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.4); overflow: hidden; }
  .search-toggle-slider { position: absolute; top: 2px; bottom: 2px; background: #c9a84c; border-radius: 36px; transition: all 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28); box-shadow: 0 2px 14px rgba(201, 168, 76, 0.4); z-index: 0; }
  .search-toggle-btn { position: relative; z-index: 1; flex: 1; font-family: 'Instrument Sans', sans-serif; font-size: 0.65rem; color: #7a7870; cursor: pointer; border: none; background: transparent; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .search-toggle-btn.active { color: #0e0e10; }
`

const searchInputStyle: React.CSSProperties = { flex: 1, background: '#16161a', border: '1px solid #2a2a33', borderRadius: 24, padding: '12px 24px', color: '#fff', outline: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.95rem' }
const topBarBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#7a7870', cursor: 'pointer', display: 'flex', padding: 0 }
const trStyle: React.CSSProperties = { borderBottom: '1px solid #2a2a33', cursor: 'pointer', transition: 'background 0.2s' }
const filterBtnStyle: React.CSSProperties = { fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.75rem', padding: '4px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }
const refBtnStyle: React.CSSProperties = { fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.8rem', padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a33', background: 'transparent', color: '#b8b5ae', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const tableHeaderStyle: React.CSSProperties = { padding: '12px 16px', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a7870', fontWeight: 600 }

const GraphView = dynamic(() => import('@/components/features/graph/GraphView'), { ssr: false })
const EntryEditor = dynamic(() => import('@/components/features/entries/EntryEditor'), { ssr: false })
const AIPanel = dynamic(() => import('@/components/features/ai/AIPanel'), { ssr: false })
const SourcesView = dynamic(() => import('@/components/features/sources/SourcesView'), { ssr: false })


const TYPE_COLORS: Record<string, string> = { definition: '#6b8fcc', theorem: '#c96b6b', lemma: '#8fcc8f', corollary: '#cc6ba8', example: '#cc9f6b', remark: '#a06bcc' }
const ENTRY_TYPES = ['definition', 'theorem', 'lemma', 'corollary', 'example', 'remark']
const RELATION_LABELS: Record<string, string> = { uses: 'Uses', example_of: 'Examples', generalizes: 'Generalizes', proof_depends_on: 'Proof Depends On', related_to: 'Related', contrasts_with: 'Contrasts' }

function MathBaseApp() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [entries, setEntries] = useState<Entry[]>([])
  const [selected, setSelected] = useState<Entry | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [editorKey, setEditorKey] = useState(0)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showAllTags, setShowAllTags] = useState(false)

  const [activeView, setActiveView] = useState<'dashboard' | 'entries' | 'graph' | 'entry' | 'sources' | 'deleted'>(
    (searchParams.get('view') as any) || 'dashboard'
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [aiWidth, setAiWidth] = useState(340)
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view')
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null })
  const [showAI, setShowAI] = useState(false)
  const [loading, setLoading] = useState(true)

  const [deletedItems, setDeletedItems] = useState<any[]>([])
  const [showDeleted, setShowDeleted] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // Table Select States
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set())
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<Set<string>>(new Set())

  const loadEntries = useCallback(async () => {
    const res = await fetch('/api/entries')
    const data = await res.json()
    setEntries(data)
    setLoading(false)
  }, [])

  const loadSources = useCallback(async () => {
    const res = await fetch('/api/sources')
    setSources(await res.json())
  }, [])

  const loadRelations = useCallback(async () => {
    const res = await fetch('/api/relations')
    setRelations(await res.json())
  }, [])

  const loadDeleted = useCallback(async () => {
    const res = await fetch('/api/deleted')
    setDeletedItems(await res.json())
  }, [])

  useEffect(() => { loadEntries(); loadSources(); loadRelations(); loadDeleted() }, [loadEntries, loadSources, loadRelations, loadDeleted])

  // Auto-refresh data when switching views
  useEffect(() => {
    if (activeView === 'entries') { loadEntries() }
    else if (activeView === 'sources') { loadSources() }
    else if (activeView === 'deleted') { loadDeleted() }
    else if (activeView === 'dashboard') { loadEntries(); loadSources() }
  }, [activeView, loadEntries, loadSources, loadDeleted])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const viewParam = searchParams.get('view') as 'dashboard' | 'entries' | 'graph' | 'sources' | 'deleted' | 'entry' | null
    const entryParam = searchParams.get('entry')
    if (mode === 'new' && viewParam === 'entry') { setActiveView('entry'); return }
    if (entryParam && entries.length > 0) {
      const entryId = parseInt(entryParam)
      const entry = entries.find(e => e.id === entryId)
      if (entry) {
        if (selected?.id !== entry.id) setShowAllTags(false);
        setSelected(entry); setActiveView('entry'); setMode('view')
      }
    } else if (viewParam && ['dashboard', 'entries', 'graph', 'sources', 'deleted', 'entry'].includes(viewParam)) { setActiveView(viewParam as any); setMode('view') }
    else if (entries.length > 0) { setActiveView('dashboard'); setMode('view') }
  }, [searchParams, entries])

  useEffect(() => {
    if (!search.trim()) { loadEntries(); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}&mode=${searchMode}`)
      setEntries(await res.json())
    }, 300)
    return () => clearTimeout(t)
  }, [search, searchMode, loadEntries])

  useEffect(() => { setCurrentPage(1); setSelectedEntryIds(new Set()) }, [activeTags, activeTypes, search])

  const allTags = [...new Set(entries.flatMap(e => e.tags))].sort()
  let filtered = entries
  if (activeTags.size > 0) filtered = filtered.filter(e => e.tags.some(tag => activeTags.has(tag)))
  if (activeTypes.size > 0) filtered = filtered.filter(e => activeTypes.has(e.type))

  const sorted = [...filtered]
  if (!sortConfig.direction) {
    sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } else {
    sorted.sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''
      if (sortConfig.key === 'Type') { valA = a.type; valB = b.type }
      else if (sortConfig.key === 'Title') { valA = a.title.toLowerCase(); valB = b.title.toLowerCase() }
      else if (sortConfig.key === 'Last Update') { valA = new Date(a.updatedAt).getTime(); valB = new Date(b.updatedAt).getTime() }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  // Pagination Logic Helper
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // All Entries Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages, currentPage])
  const paginatedEntries = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Recently Deleted Pagination
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedFilterType, setDeletedFilterType] = useState<'all' | 'entries' | 'sources'>('all')

  const filteredDeletedItems = deletedItems.filter(item => {
    if (deletedFilterType === 'entries' && item.deletedItemType !== 'entry') return false
    if (deletedFilterType === 'sources' && item.deletedItemType !== 'source') return false

    if (item.deletedItemType === 'entry') {
      if (activeTags.size > 0 && (!item.tags || !item.tags.some((tag: string) => activeTags.has(tag)))) return false
      if (activeTypes.size > 0 && !activeTypes.has(item.type)) return false
    } else {
      if (activeTags.size > 0 || activeTypes.size > 0) return false
    }
    return true
  })

  const sortedDeletedItems = [...filteredDeletedItems]
  if (!sortConfig.direction) {
    sortedDeletedItems.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
  } else {
    sortedDeletedItems.sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      const typeA = a.deletedItemType === 'source' ? (a.sourceType || 'PDF') : (a.type || 'entry')
      const typeB = b.deletedItemType === 'source' ? (b.sourceType || 'PDF') : (b.type || 'entry')

      if (sortConfig.key === 'Type') { valA = typeA.toLowerCase(); valB = typeB.toLowerCase() }
      else if (sortConfig.key === 'Title') { valA = a.title.toLowerCase(); valB = b.title.toLowerCase() }
      else if (sortConfig.key === 'Last Update') { valA = new Date(a.updatedAt || a.createdAt).getTime(); valB = new Date(b.updatedAt || b.createdAt).getTime() }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  const totalDeletedPages = Math.max(1, Math.ceil(sortedDeletedItems.length / itemsPerPage))
  useEffect(() => { if (deletedPage > totalDeletedPages) setDeletedPage(totalDeletedPages) }, [totalDeletedPages, deletedPage])
  const paginatedDeleted = sortedDeletedItems.slice((deletedPage - 1) * itemsPerPage, deletedPage * itemsPerPage)

  const handleSave = async (entry: any, versionNote?: string) => {
    const method = entry.id ? 'PUT' : 'POST'
    const url = entry.id ? `/api/entries/${entry.id}` : '/api/entries'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...entry, versionNote }) })
    const savedEntry = await res.json()
    await loadEntries(); await loadRelations()
    setSelected(savedEntry); setMode('view')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    loadEntries(); loadRelations(); loadDeleted()
    if (activeView === 'entry' && selected?.id === id) goToView('entries')
  }

  const handleBulkDelete = async () => {
    if (selectedEntryIds.size === 0) return
    if (!confirm(`Are you sure you want to delete the ${selectedEntryIds.size} selected entries?`)) return

    try {
      const ids = Array.from(selectedEntryIds)
      await fetch('/api/entries/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      setSelectedEntryIds(new Set())
      loadEntries(); loadRelations(); loadDeleted()
    } catch (e) {
      alert('Bulk delete failed')
    }
  }

  const handleRestore = async (item: any) => {
    const url = item.deletedItemType === 'source' ? `/api/sources/${item.id}` : `/api/entries/${item.id}`
    await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDeleted: false }) })
    await loadEntries(); await loadSources(); await loadRelations(); await loadDeleted()
  }

  const handlePermanentDelete = async (item: any) => {
    if (!confirm('Are you sure you want to permanently delete this item?\nThis action cannot be undone.')) return
    try {
      const url = item.deletedItemType === 'source' ? `/api/sources/permanent/${item.id}` : `/api/entries/permanent/${item.id}`
      await fetch(url, { method: 'DELETE' })
      loadDeleted(); loadEntries(); loadSources()
    } catch { }
  }

  const handleDeleteAllPermanently = async () => {
    if (!confirm('This will permanently delete ALL items in Recently Deleted.\nThis action cannot be undone.')) return
    try {
      await fetch('/api/entries/permanent-all', { method: 'DELETE' })
      setDeletedItems([])
      setSelectedDeletedIds(new Set())
      loadEntries(); loadSources()
    } catch { }
  }

  const getDeletedKey = (item: any) => `${item.deletedItemType}-${item.id}`

  const handleBulkRestoreDeleted = async () => {
    if (selectedDeletedIds.size === 0) return
    const keysToRestore = Array.from(selectedDeletedIds)
    const itemsToRestore = deletedItems.filter(e => keysToRestore.includes(getDeletedKey(e)))

    for (const item of itemsToRestore) {
      await handleRestore(item)
    }
    setSelectedDeletedIds(new Set())
  }

  const handleBulkDeletePermanently = async () => {
    if (selectedDeletedIds.size === 0) return
    if (!confirm(`Are you sure you want to permanently delete the ${selectedDeletedIds.size} selected items?\nThis action cannot be undone.`)) return

    const keysToDelete = Array.from(selectedDeletedIds)
    const itemsToDelete = deletedItems.filter(e => keysToDelete.includes(getDeletedKey(e)))
    try {
      for (const item of itemsToDelete) {
        const url = item.deletedItemType === 'source' ? `/api/sources/permanent/${item.id}` : `/api/entries/permanent/${item.id}`
        await fetch(url, { method: 'DELETE' })
      }
      setSelectedDeletedIds(new Set())
      loadDeleted(); loadEntries(); loadSources()
    } catch { alert('Bulk permanent delete failed') }
  }

  const goToUrl = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    Object.entries(params).forEach(([key, value]) => { if (value === null) current.delete(key); else current.set(key, value) })
    router.push(`${pathname}?${current.toString()}`)
  }

  const goToView = (view: 'dashboard' | 'entries' | 'graph' | 'sources' | 'deleted') => { goToUrl({ view, entry: null }) }
  const selectEntry = (e: Entry) => { setShowAI(false); goToUrl({ entry: e.id.toString(), view: null }) }
  const handleSearchChange = (val: string) => { setSearch(val); if (val.trim() !== '' && activeView !== 'entries') goToView('entries') }

  const startResizingAI = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    const startX = mouseDownEvent.clientX; const startWidth = aiWidth
    const onMouseMove = (me: MouseEvent) => { setAiWidth(Math.max(340, Math.min(800, startWidth + (startX - me.clientX)))) }
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); document.body.style.cursor = 'default' }
    document.body.style.cursor = 'col-resize'; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp)
  }, [aiWidth])

  // Get relations for selected entry
  const getEntryRelations = (entryId: number) => {
    const outgoing = relations.filter(r => r.fromEntryId === entryId)
    const incoming = relations.filter(r => r.toEntryId === entryId)
    return { outgoing, incoming }
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc'
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc'
      else if (sortConfig.direction === 'desc') direction = null
    }
    setSortConfig({ key, direction })
  }

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return null
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} style={{ marginLeft: 4, display: 'inline' }} /> : <ArrowDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0e0e10', color: '#e8e6df', overflow: 'hidden' }}>
      <Sidebar sidebarOpen={sidebarOpen} activeView={activeView} goToView={goToView}
        deletedEntries={deletedItems}
        onNewEntry={() => {
          setEditorKey(prev => prev + 1)
          goToUrl({ view: 'entry', entry: null }); setSelected(null); setMode('new')
        }}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* TOP BAR */}
        <div style={{ height: 64, minHeight: 64, boxSizing: 'border-box', borderBottom: '1px solid #2a2a33', background: '#0e0e10', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, zIndex: 10 }}>
          <div style={{ flex: 1, maxWidth: 640, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                ref={searchInputRef}
                value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Search in your knowledge repository..."
                style={{ ...searchInputStyle, paddingRight: 40 }}
                onFocus={e => {
                  e.target.style.borderColor = '#c9a84c';
                  e.target.style.boxShadow = '0 0 0 4px rgba(201, 168, 76, 0.15)';
                  if (activeView !== 'entries') goToView('entries')
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#2a2a33';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div
                onClick={() => setShowCommandPalette(true)}
                style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <span
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#7a7870', background: '#1e1e24', padding: '2px 6px', borderRadius: 4, border: '1px solid #2a2a33', transition: 'all 0.2s', userSelect: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#e8e6df'; e.currentTarget.style.borderColor = '#c9a84c80' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#7a7870'; e.currentTarget.style.borderColor = '#2a2a33' }}
                >
                  ⌘K
                </span>
              </div>
            </div>
            <div className="search-toggle-container">
              <div className="search-toggle-slider" style={{
                left: searchMode === 'text' ? '2px' : '50%',
                width: 'calc(50% - 2px)'
              }} />
              <button onClick={() => setSearchMode('text')} className={`search-toggle-btn ${searchMode === 'text' ? 'active' : ''}`}>Text</button>
              <button onClick={() => setSearchMode('semantic')} className={`search-toggle-btn ${searchMode === 'semantic' ? 'active' : ''}`}>Semantic</button>
            </div>
          </div>
        </div>

        {showCommandPalette && (
          <CommandPalette
            entries={entries}
            sources={sources}
            onClose={() => setShowCommandPalette(false)}
            goToView={goToView}
            selectEntry={(id) => { const e = entries.find(x => x.id === id); if (e) selectEntry(e); }}
            onNewEntry={() => {
              setEditorKey(prev => prev + 1)
              goToUrl({ view: 'entry', entry: null }); setSelected(null); setMode('new')
            }}
          />
        )}

        {/* EDITOR VIEW */}
        {(mode === 'new' || mode === 'edit') && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <EntryEditor
              key={editorKey}
              initial={mode === 'edit' ? selected! : undefined}
              allEntries={entries.map(e => ({ id: e.id, title: e.title, type: e.type, tags: e.tags }))}
              sources={sources.map(s => ({ id: s.id, title: s.title, sourceType: s.sourceType }))}
              onSave={handleSave}
              onCancel={() => { setMode('view'); selected ? goToUrl({ entry: selected.id.toString(), view: null }) : goToView('dashboard') }}
              onDelete={mode === 'edit' && selected ? () => handleDelete(selected.id) : undefined}
            />
          </div>
        )}

        {/* DASHBOARD VIEW */}
        {activeView === 'dashboard' && mode === 'view' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32, padding: '40px 60px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'EB Garamond, serif', fontSize: '3.5rem', color: '#c9a84c', marginBottom: 12 }}>∂ MathBase</div>
              <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.85rem', color: '#7a7870', letterSpacing: '0.08em' }}>Your personal mathematical knowledge repository</div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { label: 'Entries', value: entries.length }, { label: 'Definitions', value: entries.filter(e => e.type === 'definition').length },
                { label: 'Theorems', value: entries.filter(e => e.type === 'theorem').length }, { label: 'Sources', value: sources.length }
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '16px 24px', background: '#16161a', border: '1px solid #2a2a33', borderRadius: 8, minWidth: 90 }}>
                  <div style={{ fontFamily: 'EB Garamond, serif', fontSize: '2rem', color: '#c9a84c' }}>{stat.value}</div>
                  <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.7rem', color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            {entries.length > 0 && (
              <div style={{ width: '100%', maxWidth: 560 }}>
                <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a7870', marginBottom: 12 }}>Recent Entries</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...entries].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map(e => (
                    <div key={e.id} onClick={() => selectEntry(e)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#16161a', border: '1px solid #2a2a33', borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={el => (el.currentTarget.style.borderColor = '#c9a84c')} onMouseLeave={el => (el.currentTarget.style.borderColor = '#2a2a33')}>
                      <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', background: TYPE_COLORS[e.type] + '22', color: TYPE_COLORS[e.type], flexShrink: 0 }}>{e.type.slice(0, 3)}</span>
                      <span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1rem', flex: 1 }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                      <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.7rem', color: '#7a7870' }}>{new Date(e.updatedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {entries.length === 0 && (
              <button onClick={() => { goToUrl({ view: 'entry', entry: null }); setMode('new') }} className="btn-base btn-gold" style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
                + Create your first entry
              </button>
            )}
          </div>
        )}

        {/* ALL ENTRIES VIEW */}
        {activeView === 'entries' && mode === 'view' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, minHeight: 36 }}>
              <h2 style={{ fontFamily: 'EB Garamond, serif', fontSize: '2.2rem', color: '#c9a84c', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center' }}>
                <Library size={28} style={{ marginRight: 10 }} />
                {search ? `Search Results for "${search}"` : 'All Entries'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 200, justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.85rem', color: '#7a7870', whiteSpace: 'nowrap' }}>{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'} found</span>
                {selectedEntryIds.size > 0 && (
                  <button onClick={handleBulkDelete} className="btn-base btn-red">
                    Delete Selected ({selectedEntryIds.size})
                  </button>
                )}
              </div>
            </div>
            {/* Filter Button & Popover */}
            <div style={{ marginBottom: 16 }}>
              <FilterDropdown 
                allTags={allTags}
                ENTRY_TYPES={ENTRY_TYPES}
                TYPE_COLORS={TYPE_COLORS}
                activeTags={activeTags}
                activeTypes={activeTypes}
                setActiveTags={setActiveTags}
                setActiveTypes={setActiveTypes}
                isOpen={showFilterDropdown}
                setIsOpen={setShowFilterDropdown}
              />
            </div>
            {/* Top pagination & Page Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.8rem', color: '#7a7870' }}>Rows per page:</span>
                <select
                  value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  style={{ background: '#1e1e24', color: '#e8e6df', border: '1px solid #2a2a33', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'Instrument Sans', outline: 'none', cursor: 'pointer' }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
            <div style={{ background: '#16161a', border: '1px solid #2a2a33', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                <thead><tr style={{ borderBottom: '1px solid #2a2a33', background: '#1e1e24' }}>
                  <th style={{ ...tableHeaderStyle, width: 40, paddingRight: 0 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      onClick={e => {
                        const newSet = new Set(selectedEntryIds)
                        const allSelected = paginatedEntries.length > 0 && paginatedEntries.every(e => selectedEntryIds.has(e.id))
                        if (!allSelected) paginatedEntries.forEach(ent => newSet.add(ent.id))
                        else paginatedEntries.forEach(ent => newSet.delete(ent.id))
                        setSelectedEntryIds(newSet)
                      }}
                    >
                      {(paginatedEntries.length > 0 && paginatedEntries.every(e => selectedEntryIds.has(e.id))) ? <CheckSquare size={18} color="#c9a84c" /> : <Square size={18} color="#7a7870" />}
                    </button>
                  </th>
                  <th style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('Type')}>Type {renderSortIcon('Type')}</th>
                  <th style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('Title')}>Title {renderSortIcon('Title')}</th>
                  <th style={tableHeaderStyle}>Tags</th>
                  <th style={tableHeaderStyle}>Last Update</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('Last Update')}>Date {renderSortIcon('Last Update')}</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skel-${i}`} style={trStyle}>
                        <td style={{ padding: 16 }}><div className="skeleton-row" style={{ width: 18 }} /></td>
                        <td style={{ padding: 16 }}><div className="skeleton-row" style={{ width: '60%' }} /></td>
                        <td style={{ padding: 16 }}><div className="skeleton-row" style={{ width: '80%' }} /></td>
                        <td style={{ padding: 16 }}><div className="skeleton-row" style={{ width: '70%' }} /></td>
                        <td style={{ padding: 16 }}><div className="skeleton-row" style={{ width: '40%' }} /></td>
                        <td style={{ padding: 16 }}><div className="skeleton-row" style={{ width: '50%' }} /></td>
                        <td style={{ padding: 16 }}><div className="skeleton-row" style={{ width: 30 }} /></td>
                      </tr>
                    ))
                  )
                    : paginatedEntries.length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#7a7870', fontFamily: 'Instrument Sans', fontSize: '0.9rem' }}>No entries match your criteria.</td></tr>
                      : paginatedEntries.map(e => (
                        <tr key={e.id} style={trStyle} className="hover-row"
                          onMouseEnter={el => {
                            el.currentTarget.style.background = '#1e1e24';
                            const actions = el.currentTarget.querySelector('.row-actions') as HTMLElement;
                            if (actions) actions.style.opacity = '1';
                          }}
                          onMouseLeave={el => {
                            el.currentTarget.style.background = 'transparent';
                            const actions = el.currentTarget.querySelector('.row-actions') as HTMLElement;
                            if (actions) actions.style.opacity = '0';
                          }}>
                          <td style={{ padding: '16px 0 16px 16px', width: 40 }} onClick={ev => {
                            ev.stopPropagation();
                            const newSet = new Set(selectedEntryIds);
                            if (selectedEntryIds.has(e.id)) newSet.delete(e.id); else newSet.add(e.id);
                            setSelectedEntryIds(newSet)
                          }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                              {selectedEntryIds.has(e.id) ? <CheckSquare size={18} color="#c9a84c" /> : <Square size={18} color="#7a7870" />}
                            </button>
                          </td>
                          <td onClick={() => selectEntry(e)} style={{ padding: 16, width: 120 }}><span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.1em', background: TYPE_COLORS[e.type] + '15', color: TYPE_COLORS[e.type] }}>{e.type}</span></td>
                          <td onClick={() => selectEntry(e)} style={{ padding: 16 }}><span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.2rem', color: '#e8e6df', lineHeight: 1.2 }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} /></td>
                          <td onClick={() => selectEntry(e)} style={{ padding: 16, width: '20%' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', opacity: 0.6 }}>{e.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '0.7rem', fontFamily: 'Instrument Sans', color: '#7a7870' }}>#{t}</span>)}{e.tags.length > 3 && <span style={{ fontSize: '0.7rem', fontFamily: 'Instrument Sans', color: '#7a7870' }}>+{e.tags.length - 3}</span>}</div></td>
                          <td onClick={() => selectEntry(e)} style={{ padding: 16, width: 160, fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.75rem', color: '#7a7870', fontStyle: e.versionNote && e.versionNote.toLowerCase() !== 'initial version' ? 'italic' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(!e.versionNote || e.versionNote.toLowerCase() === 'initial version') ? '-' : e.versionNote}</td>
                          <td onClick={() => selectEntry(e)} style={{ padding: 16, width: 100, textAlign: 'right', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.75rem', color: '#5a5850' }}>{new Date(e.updatedAt).toLocaleDateString()}</td>
                          <td style={{ padding: '16px 8px', width: 90, textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                            <div className="row-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: 0, transition: 'opacity 0.2s ease-in-out' }}>
                              <button onClick={(ev) => { ev.stopPropagation(); selectEntry(e); setTimeout(() => setMode('edit'), 50); }} className="icon-btn icon-btn-gold" title="Edit"><Pencil size={15} /></button>
                              <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="icon-btn icon-btn-red" title="Delete"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {!loading && sorted.length > itemsPerPage && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} style={{ marginTop: 24, padding: '0 8px' }} />
            )}
          </div>
        )}

        {/* DELETED ENTRIES VIEW */}
        {activeView === 'deleted' && mode === 'view' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, minHeight: 36 }}>
              <h2 style={{ fontFamily: 'EB Garamond, serif', fontSize: '2.2rem', color: '#c96b6b', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center' }}>
                <Trash2 size={28} style={{ marginRight: 10 }} />
                Recently Deleted
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.85rem', color: '#7a7870', whiteSpace: 'nowrap' }}>{filteredDeletedItems.length} deleted {filteredDeletedItems.length === 1 ? 'file' : 'files'} found</span>
                {selectedDeletedIds.size > 0 && (
                  <>
                    <button onClick={handleBulkRestoreDeleted} className="btn-base btn-green" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RotateCcw size={16} /> Restore Selected ({selectedDeletedIds.size})
                    </button>
                    <button onClick={handleBulkDeletePermanently} className="btn-base btn-red" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Trash2 size={16} /> Delete Permanently ({selectedDeletedIds.size})
                    </button>
                  </>
                )}
                {deletedItems.length > 0 && selectedDeletedIds.size === 0 && (
                  <button onClick={handleDeleteAllPermanently} className="btn-base btn-red" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={16} /> Delete All Permanently
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              {(['all', 'entries', 'sources'] as const).map(t => (
                <button key={t} onClick={() => { setDeletedFilterType(t); setDeletedPage(1); setSelectedDeletedIds(new Set()) }}
                  style={{ ...filterBtnStyle, borderColor: deletedFilterType === t ? '#c96b6b' : '#2a2a33', background: deletedFilterType === t ? '#c96b6b22' : '#16161a', color: deletedFilterType === t ? '#c96b6b' : '#b8b5ae', fontWeight: deletedFilterType === t ? 700 : 400 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}

              <div style={{ width: 1, height: 24, background: '#2a2a33', margin: '0 8px' }} />

              <div style={{ position: 'relative' }}>
                <FilterDropdown 
                  allTags={allTags}
                  ENTRY_TYPES={ENTRY_TYPES}
                  TYPE_COLORS={TYPE_COLORS}
                  activeTags={activeTags}
                  activeTypes={activeTypes}
                  setActiveTags={setActiveTags}
                  setActiveTypes={setActiveTypes}
                  isOpen={showFilterDropdown}
                  setIsOpen={setShowFilterDropdown}
                />
              </div>
            </div>

            {/* Top pagination & Page Size for Deleted */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Instrument Sans', fontSize: '0.8rem', color: '#7a7870' }}>Rows per page:</span>
                <select
                  value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  style={{ background: '#1e1e24', color: '#e8e6df', border: '1px solid #2a2a33', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'Instrument Sans', outline: 'none', cursor: 'pointer' }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <Pagination currentPage={deletedPage} totalPages={totalDeletedPages} onPageChange={setDeletedPage} />
            </div>
            <div style={{ background: '#16161a', border: '1px solid #2a2a33', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ borderBottom: '1px solid #2a2a33', background: '#1e1e24' }}>
                  <th style={{ ...tableHeaderStyle, width: 40, paddingRight: 0 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      onClick={() => {
                        const newSet = new Set(selectedDeletedIds)
                        const allSelected = paginatedDeleted.length > 0 && paginatedDeleted.every(e => selectedDeletedIds.has(getDeletedKey(e)))
                        if (!allSelected) paginatedDeleted.forEach(ent => newSet.add(getDeletedKey(ent)))
                        else paginatedDeleted.forEach(ent => newSet.delete(getDeletedKey(ent)))
                        setSelectedDeletedIds(newSet)
                      }}
                    >
                      {(paginatedDeleted.length > 0 && paginatedDeleted.every(e => selectedDeletedIds.has(getDeletedKey(e)))) ? <CheckSquare size={18} color="#c96b6b" /> : <Square size={18} color="#7a7870" />}
                    </button>
                  </th>
                  <th style={tableHeaderStyle}>Type</th><th style={tableHeaderStyle}>Title</th><th style={{ ...tableHeaderStyle }}>Date Deleted</th><th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
                </tr></thead>
                <tbody>
                  {paginatedDeleted.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#7a7870', fontFamily: 'Instrument Sans', fontSize: '0.9rem' }}>Trash is empty.</td></tr>
                    : paginatedDeleted.map(e => {
                      const deletedKey = getDeletedKey(e)
                      const displayType = e.deletedItemType === 'source' ? (e.sourceType || 'PDF').toUpperCase() : (e.type || 'entry')
                      const typeColor = e.deletedItemType === 'source' ? '#c9a84c' : (TYPE_COLORS[e.type] || '#7a7870')
                      return (
                        <tr key={deletedKey} style={trStyle}
                          onMouseEnter={el => {
                            el.currentTarget.style.background = '#1e1e24';
                            const actions = el.currentTarget.querySelector('.row-actions') as HTMLElement;
                            if (actions) actions.style.opacity = '1';
                          }}
                          onMouseLeave={el => {
                            el.currentTarget.style.background = 'transparent';
                            const actions = el.currentTarget.querySelector('.row-actions') as HTMLElement;
                            if (actions) actions.style.opacity = '0';
                          }}>
                          <td style={{ padding: '16px 0 16px 16px' }} onClick={ev => {
                            ev.stopPropagation()
                            const newSet = new Set(selectedDeletedIds)
                            if (selectedDeletedIds.has(deletedKey)) newSet.delete(deletedKey); else newSet.add(deletedKey)
                            setSelectedDeletedIds(newSet)
                          }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                              {selectedDeletedIds.has(deletedKey) ? <CheckSquare size={18} color="#c96b6b" /> : <Square size={18} color="#7a7870" />}
                            </button>
                          </td>
                          <td style={{ padding: 16, width: 120 }}><span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.1em', background: typeColor + '15', color: typeColor }}>{displayType}</span></td>
                          <td style={{ padding: 16 }}><span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.2rem', color: '#e8e6df', lineHeight: 1.2, opacity: 0.6 }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} /></td>
                          <td style={{ padding: 16, width: 160, fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.75rem', color: '#5a5850' }}>{new Date(e.updatedAt || e.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '16px 8px', width: 100, textAlign: 'center' }}>
                            <div className="row-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: 0, transition: 'opacity 0.2s ease-in-out' }}>
                              <button onClick={() => handleRestore(e)} className="icon-btn icon-btn-green" title="Restore"><RotateCcw size={15} /></button>
                              <button onClick={() => handlePermanentDelete(e)} className="icon-btn icon-btn-red" title="Delete Permanently"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            {filteredDeletedItems.length > itemsPerPage && (
              <Pagination currentPage={deletedPage} totalPages={totalDeletedPages} onPageChange={setDeletedPage} style={{ marginTop: 24, padding: '0 8px' }} />
            )}
          </div>
        )}
        {activeView === 'graph' && mode === 'view' && (
          <div style={{ flex: 1, background: '#0e0e10' }}>
            <GraphView entries={entries} selectedId={selected?.id} onSelect={(id) => { const e = entries.find(x => x.id === id); if (e) selectEntry(e) }} relations={relations} />
          </div>
        )}

        {/* SOURCES VIEW */}
        {activeView === 'sources' && mode === 'view' && <SourcesView sources={sources} onReload={loadSources} />}


        {/* ENTRY READING VIEW */}
        <div style={{ display: (activeView === 'entry' && mode === 'view' && selected) ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          {selected ? (<>
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* STICKY HEADER */}
              <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(14, 14, 16, 0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #2a2a33', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => { window.history.back(); }} className="btn-base btn-outline" style={{ padding: '6px 10px' }}><ArrowLeft size={16} /> Back</button>
                  <span style={{ display: 'inline-block', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 4, background: `${TYPE_COLORS[selected.type]}22`, color: TYPE_COLORS[selected.type] }}>{selected.type}</span>
                  <h1 style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.2, margin: 0, color: '#e8e6df', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }} dangerouslySetInnerHTML={{ __html: renderTitle(selected.title) }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <button onClick={() => exportToPDF([selected])} className="btn-base btn-outline" style={{ padding: '6px 14px' }} title="Download PDF"><FileText size={14} /> PDF</button>
                  <style>{`.neon-questions-btn { border-color: #7eb8b0; color: #7eb8b0; background: rgba(126, 184, 176, 0.05); box-shadow: 0 0 10px rgba(126, 184, 176, 0.3); text-shadow: 0 0 5px rgba(126, 184, 176, 0.5); transition: all 0.2s ease-in-out; border-radius: 6px; padding: 6px 14px; cursor: pointer; border: 1px solid; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; } .neon-questions-btn:hover { background: rgba(126, 184, 176, 0.1); box-shadow: 0 0 18px rgba(126, 184, 176, 0.5); }`}</style>
                  <button onClick={() => setShowAI(!showAI)} className="neon-questions-btn">
                    {showAI ? <X size={14} /> : <Sparkles size={14} />} {showAI ? 'Hide AI' : 'Questions?'}
                  </button>
                  <button onClick={() => setMode('edit')} className="btn-base btn-gold" style={{ padding: '6px 14px' }}><Pencil size={14} /> Edit</button>
                </div>
              </div>

              {/* MAIN CONTENT AREA */}
              <div style={{ padding: '32px 40px', maxWidth: 840, margin: '0 auto' }}>
                <h1 style={{ fontFamily: 'EB Garamond, serif', fontSize: '2.5rem', fontWeight: 600, lineHeight: 1.2, margin: '0 0 24px', color: '#e8e6df' }} dangerouslySetInnerHTML={{ __html: renderTitle(selected.title) }} />

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {selected.tags.map(t => (
                    <span key={t} style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.72rem', padding: '3px 9px', borderRadius: 20, border: '1px solid #2a2a33', color: '#7a7870' }}>#{t}</span>
                  ))}
                </div>

                {/* Keywords */}
                {selected.symbolKeywords && selected.symbolKeywords.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a7870', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Key size={12} /> Keywords
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(showAllTags ? selected.symbolKeywords : selected.symbolKeywords.slice(0, 5)).map(k => (
                        <span key={k} style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, background: '#7eb8b015', border: '1px solid #7eb8b033', color: '#7eb8b0' }}>{k}</span>
                      ))}
                      {!showAllTags && selected.symbolKeywords.length > 5 && (
                        <button onClick={() => setShowAllTags(true)} style={{ background: 'transparent', border: '1px solid #2a2a33', color: '#c9a84c', borderRadius: 4, padding: '2px 8px', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.68rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a84c'; e.currentTarget.style.background = '#c9a84c11' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a33'; e.currentTarget.style.background = 'transparent' }}
                        >
                          +{selected.symbolKeywords.length - 5} more
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Source info */}
                {selected.sourceId && (() => {
                  const src = sources.find(s => s.id === selected.sourceId)
                  if (!src) return null
                  const handleClick = () => {
                    if (src.filepath) {
                      window.open(src.filepath.startsWith('http') ? src.filepath : `${typeof window !== 'undefined' ? window.location.origin : ''}/${src.filepath.replace(/^\/+/, '')}`, '_blank')
                    }
                  }
                  return (
                    <div onClick={handleClick}
                      style={{ marginBottom: 20, padding: '12px 16px', background: '#16161a', border: '1px solid #2a2a33', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: src.filepath ? 'pointer' : 'default', transition: 'all 0.2s ease-in-out' }}
                      onMouseEnter={e => { if (src.filepath) { e.currentTarget.style.background = '#1e1e24'; e.currentTarget.style.borderColor = '#c9a84c40'; } }}
                      onMouseLeave={e => { if (src.filepath) { e.currentTarget.style.background = '#16161a'; e.currentTarget.style.borderColor = '#2a2a33'; } }}>
                      <BookOpen size={18} color="#c9a84c" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.85rem', color: '#e8e6df', fontWeight: 600 }}>{src.title}</div>
                        <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: '#7a7870', marginTop: 2 }}>
                          {src.sourceType.toUpperCase()}{selected.pageRange ? ` · pp. ${selected.pageRange}` : ''}
                        </div>
                      </div>
                      {src.filepath && <ArrowRight size={16} color="#c9a84c" opacity={0.6} />}
                    </div>
                  )
                })()}

                {/* Content */}
                <div style={{ borderTop: '1px solid #2a2a33', paddingTop: 22, marginBottom: 32 }}>
                  <RenderedContent content={selected.content} />
                </div>

                {/* Typed Relationships */}
                {(() => {
                  const { outgoing, incoming } = getEntryRelations(selected.id)
                  const sections: { label: string; entries: { entry: Entry; rel: string }[] }[] = []

                  // Group outgoing by relation type
                  const outByType: Record<string, Entry[]> = {}
                  outgoing.forEach(r => {
                    const e = entries.find(x => x.id === r.toEntryId)
                    if (e) { if (!outByType[r.relationType]) outByType[r.relationType] = []; outByType[r.relationType].push(e) }
                  })
                  Object.entries(outByType).forEach(([type, ents]) => {
                    sections.push({ label: RELATION_LABELS[type] || type.replace(/_/g, ' '), entries: ents.map(e => ({ entry: e, rel: type })) })
                  })

                  // Group incoming as "Used by"
                  const usedBy = incoming.map(r => entries.find(x => x.id === r.fromEntryId)).filter(Boolean) as Entry[]
                  if (usedBy.length > 0) sections.push({ label: 'Used By', entries: usedBy.map(e => ({ entry: e, rel: 'used_by' })) })

                  // Also show old-style refs not covered by relations
                  const relatedIds = new Set([...outgoing.map(r => r.toEntryId), ...incoming.map(r => r.fromEntryId)])
                  const unlinkedRefs = selected.refs.filter(rid => !relatedIds.has(rid)).map(rid => entries.find(e => e.id === rid)).filter(Boolean) as Entry[]
                  if (unlinkedRefs.length > 0) sections.push({ label: 'References', entries: unlinkedRefs.map(e => ({ entry: e, rel: 'ref' })) })

                  // Backlinks not in relations
                  const backlinks = entries.filter(e => e.refs.includes(selected.id) && e.id !== selected.id && !relatedIds.has(e.id))
                  if (backlinks.length > 0) sections.push({ label: 'Referenced By', entries: backlinks.map(e => ({ entry: e, rel: 'backlink' })) })

                  if (sections.length === 0) return null
                  return (
                    <div style={{ borderTop: '1px solid #2a2a33', paddingTop: 24 }}>
                      <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a7870', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Link2 size={14} /> Relationships
                      </div>
                      <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {sections.map(sec => (
                          <div key={sec.label}>
                            <div style={{ fontFamily: 'Instrument Sans', fontSize: '0.75rem', color: '#c9a84c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{sec.label}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                              {sec.entries.map(({ entry: e }) => (
                                <button key={e.id} onClick={() => selectEntry(e)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a33', background: '#16161a', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.2s ease-in-out' }}
                                  onMouseEnter={el => { el.currentTarget.style.borderColor = '#c9a84c'; el.currentTarget.style.background = '#1e1e24'; }}
                                  onMouseLeave={el => { el.currentTarget.style.borderColor = '#2a2a33'; el.currentTarget.style.background = '#16161a'; }}>
                                  <span style={{ color: TYPE_COLORS[e.type], fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', background: `${TYPE_COLORS[e.type]}15`, borderRadius: 4, alignSelf: 'flex-start' }}>{e.type}</span>
                                  <span style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.05rem', color: '#e8e6df', lineHeight: 1.2 }} dangerouslySetInnerHTML={{ __html: renderTitle(e.title) }} />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #2a2a33', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.72rem', color: '#7a7870' }}>
                  <div>Created {new Date(selected.createdAt).toLocaleDateString()} · Updated {new Date(selected.updatedAt).toLocaleDateString()}</div>
                  {selected.versionNote && <div style={{ marginTop: 4, color: '#c9a84c', fontStyle: 'italic' }}><span style={{ opacity: 0.7 }}>Latest Update:</span> {selected.versionNote}</div>}
                </div>

                {/* Sequential Navigation */}
                {(() => {
                  const currentIndex = sorted.findIndex(e => e.id === selected.id)
                  if (currentIndex === -1) return null

                  const prevEntry = currentIndex > 0 ? sorted[currentIndex - 1] : null
                  const nextEntry = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null

                  if (!prevEntry && !nextEntry) return null

                  return (
                    <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      {prevEntry ? (
                        <button onClick={() => selectEntry(prevEntry)} className="btn-base btn-outline" style={{ flex: 1, justifyContent: 'flex-start', padding: '12px 16px' }}>
                          <ChevronLeft size={16} style={{ marginRight: 8 }} />
                          <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#7a7870', marginBottom: 2 }}>Previous Entry</div>
                            <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prevEntry.title}</div>
                          </div>
                        </button>
                      ) : <div style={{ flex: 1 }} />}

                      {nextEntry ? (
                        <button onClick={() => selectEntry(nextEntry)} className="btn-base btn-outline" style={{ flex: 1, justifySelf: 'flex-end', justifyContent: 'flex-end', padding: '12px 16px' }}>
                          <div style={{ textAlign: 'right', overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#7a7870', marginBottom: 2 }}>Next Entry</div>
                            <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextEntry.title}</div>
                          </div>
                          <ChevronRight size={16} style={{ marginLeft: 8 }} />
                        </button>
                      ) : <div style={{ flex: 1 }} />}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* AI Panel */}
            <div key={selected.id} style={{ display: showAI ? 'flex' : 'none', width: aiWidth, minWidth: 340, borderLeft: '1px solid #2a2a33', background: '#16161a', flexDirection: 'column', position: 'relative' }}>
              <div onMouseDown={startResizingAI}
                style={{ position: 'absolute' as const, top: 0, left: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 50, background: 'transparent', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#c9a84c'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
              <AIPanel entryId={selected.id} entryTitle={selected.title} />
            </div>
          </>) : null}
        </div>
      </div>
    </div>
  )
}

function RenderedContent({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: renderContent(content) }} style={{ fontFamily: 'EB Garamond, serif', fontSize: '1.05rem', lineHeight: 1.78, color: '#ccc8c0' }} />
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ background: '#0e0e10', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Instrument Sans' }}>Loading MathBase...</div>}>
      <style dangerouslySetInnerHTML={{ __html: globalButtonStyles }} />
      <MathBaseApp />
    </Suspense>
  )
}
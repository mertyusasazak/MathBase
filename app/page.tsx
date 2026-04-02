'use client'

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Input from '@/components/ui/Input'
import { theme } from '@/lib/core/theme'
import { useMathBase } from '@/hooks/useMathBase'
import { DashboardView } from '@/components/features/dashboard/DashboardView'
import { EntriesView } from '@/components/features/entries/EntriesView'
import { DeletedItemsView } from '@/components/features/entries/DeletedItemsView'
import { ReadingView } from '@/components/features/entries/ReadingView'
import { PanelLeft, Sparkles, Pencil, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Entry } from '@/types'

// Dynamic Imports
const GraphView = dynamic(() => import('@/components/features/graph/GraphView'), { ssr: false })
const EntryEditor = dynamic(() => import('@/components/features/entries/EntryEditor'), { ssr: false })
const SourcesView = dynamic(() => import('@/components/features/sources/SourcesView'), { ssr: false })

const globalCSS = `
  body { background: ${theme.colors.background}; color: ${theme.colors.text}; margin: 0; font-family: ${theme.typography.sans}; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: ${theme.colors.background}; }
  ::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${theme.colors.textMuted}; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .row-hover-group:hover { background: #1e1e24 !important; }
  .katex-display { text-align: left !important; margin: 1em 0 !important; overflow-x: auto; overflow-y: hidden; }
  .katex-display > .katex { text-align: left !important; white-space: normal !important; }
`

function MathBaseApp() {
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
  const [showAI, setShowAI] = useState(false)
  const [aiWidth, setAiWidth] = useState(340)
  const [editorKey, setEditorKey] = useState(0)

  // Filters & Pagination State
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
      if (entry) { setSelected(entry); setActiveView('entry'); setMode('view') }
    } else if (viewParam) { setActiveView(viewParam); setMode('view') }
  }, [searchParams, entries])

  // Search Logic
  useEffect(() => {
    if (!search.trim()) { loadEntries(); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}&mode=${searchMode}`)
      // Note: In a larger app, we'd put this search logic in the hook or a separate service
      if (res.ok) { /* potentially update local entries if search filters them */ }
    }, 300)
    return () => clearTimeout(t)
  }, [search, searchMode, loadEntries])

  const goToUrl = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    Object.entries(params).forEach(([key, value]) => { if (value === null) current.delete(key); else current.set(key, value) })
    router.push(`${pathname}?${current.toString()}`)
  }

  const goToView = (view: any) => { goToUrl({ view, entry: null }) }
  const selectEntry = (e: Entry) => { setShowAI(false); goToUrl({ entry: e.id.toString(), view: null }) }

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
    setSelected(saved); setMode('view')
  }

  const handleBulkDelete = async () => {
    if (selectedEntryIds.size === 0) return
    if (!confirm(`Delete ${selectedEntryIds.size} entries?`)) return
    await fetch('/api/entries/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedEntryIds) }) })
    setSelectedEntryIds(new Set())
    await refreshAll()
  }

  const handleBulkRestoreDeleted = async () => {
    if (selectedDeletedIds.size === 0) return
    const keys = Array.from(selectedDeletedIds)
    for (const key of keys) {
      const [type, id] = key.split('-')
      const item = deletedItems.find(i => i.deletedItemType === type && i.id === parseInt(id))
      if (item) await handleRestore(item)
    }
    setSelectedDeletedIds(new Set())
  }

  const handleBulkPermanentDelete = async () => {
    if (selectedDeletedIds.size === 0) return
    if (!confirm(`Permanently delete ${selectedDeletedIds.size} items?`)) return
    const keys = Array.from(selectedDeletedIds)
    for (const key of keys) {
      const [type, id] = key.split('-')
      const item = deletedItems.find(i => i.deletedItemType === type && i.id === parseInt(id))
      if (item) await handlePermanentDelete(item)
    }
    setSelectedDeletedIds(new Set())
  }

  const handleDeleteAllPermanently = async () => {
    if (!confirm('Permanently delete ALL items in trash?')) return
    await fetch('/api/entries/permanent-all', { method: 'DELETE' })
    await refreshAll()
  }

  const startResizingAI = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    const startX = mouseDownEvent.clientX; const startWidth = aiWidth
    const onMouseMove = (me: MouseEvent) => { setAiWidth(Math.max(340, Math.min(800, startWidth + (startX - me.clientX)))) }
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp)
  }, [aiWidth])

  // Filtering processed data
  let filtered = entries.filter(e => {
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

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0e0e10', color: '#e8e6df', overflow: 'hidden' }}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        activeView={activeView}
        goToView={goToView}
        deletedEntries={deletedItems}
        onNewEntry={() => { setEditorKey(k => k + 1); setSelected(null); setMode('new'); setActiveView('entry') }}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* TOP BAR */}
        <div style={{ height: 64, borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.background, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, zIndex: 10 }}>
          <div style={{ flex: 1, maxWidth: 800, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Input
              ref={searchInputRef}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search in your knowledge repository..." fullWidth
              onFocus={() => activeView !== 'entries' && goToView('entries')}
            />
            {/* SEARCH MODE TOGGLE (SLIDER) */}
            <div
              style={{
                display: 'flex',
                background: theme.colors.surface,
                borderRadius: 20,
                padding: 2,
                position: 'relative',
                width: 150,
                height: 34,
                cursor: 'pointer',
                border: `1px solid ${theme.colors.border}`,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              onClick={() => setSearchMode(searchMode === 'text' ? 'semantic' : 'text')}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: searchMode === 'text' ? 3 : 75,
                width: 72,
                height: 26,
                background: theme.colors.accent,
                borderRadius: 16,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: `0 2px 10px ${theme.colors.accent}66`,
                zIndex: 1
              }} />
              <div style={{
                flex: 1, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: searchMode === 'text' ? theme.colors.background : theme.colors.textMuted,
                transition: 'color 0.3s ease'
              }}>
                Text
              </div>
              <div style={{
                flex: 1, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: searchMode === 'semantic' ? theme.colors.background : theme.colors.textMuted,
                transition: 'color 0.3s ease'
              }}>
                <Sparkles size={12} /> AI
              </div>
            </div>
          </div>
        </div>

        {/* VIEW AREA */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {mode === 'new' || mode === 'edit' ? (
            <EntryEditor
              key={editorKey}
              initial={selected || undefined}
              allEntries={entries}
              sources={sources}
              initialRelations={relations.filter(r => r.fromEntryId === selected?.id)}
              onSave={handleSave}
              onCancel={() => { setMode('view'); selected ? selectEntry(selected) : goToView('dashboard') }}
            />
          ) : (
            <>
              {activeView === 'dashboard' && <DashboardView entries={entries} sources={sources} onSelectEntry={selectEntry} onCreateEntry={() => setMode('new')} />}

              {activeView === 'entries' && (
                <EntriesView
                  entries={filtered} loading={loading} search={search}
                  itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
                  currentPage={currentPage} setCurrentPage={setCurrentPage}
                  selectedIds={selectedEntryIds} setSelectedIds={setSelectedEntryIds}
                  onSelectEntry={selectEntry} onEditEntry={(e) => { selectEntry(e); setMode('edit') }}
                  onDeleteEntry={handleDelete} onBulkDelete={handleBulkDelete}
                  sortConfig={sortConfig} onSort={handleSort}
                  showFilter={showFilterDropdown} setShowFilter={setShowFilterDropdown}
                  activeTags={activeTags} setActiveTags={setActiveTags}
                  activeTypes={activeTypes} setActiveTypes={setActiveTypes}
                  activeTitles={activeTitles} setActiveTitles={setActiveTitles}
                />
              )}

              {activeView === 'deleted' && (
                <DeletedItemsView
                  items={deletedItems} loading={loading}
                  itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
                  currentPage={deletedPage} setCurrentPage={setDeletedPage}
                  selectedIds={selectedDeletedIds} setSelectedIds={setSelectedDeletedIds}
                  onRestore={handleRestore} onPermanentDelete={handlePermanentDelete}
                  onBulkRestore={handleBulkRestoreDeleted} onBulkPermanentDelete={handleBulkPermanentDelete} onDeleteAll={handleDeleteAllPermanently}
                  sortConfig={sortConfig} onSort={handleSort}
                  showFilter={showFilterDropdown} setShowFilter={setShowFilterDropdown}
                  activeTags={activeTags} setActiveTags={setActiveTags}
                  activeTypes={activeTypes} setActiveTypes={setActiveTypes}
                  activeTitles={activeTitles} setActiveTitles={setActiveTitles}
                />
              )}

              {activeView === 'entry' && selected && (
                <ReadingView
                  selected={selected} entries={entries} sources={sources} relations={relations}
                  showAI={showAI} setShowAI={setShowAI} onEdit={() => setMode('edit')}
                  onBack={() => window.history.back()} onSelectEntry={selectEntry}
                  sortedEntries={filtered} aiWidth={aiWidth} onStartResizingAI={startResizingAI}
                />
              )}

              {activeView === 'graph' && <GraphView entries={entries} relations={relations} selectedId={selected?.id} onSelect={(id) => { const e = entries.find(x => x.id === id); if (e) selectEntry(e) }} />}
              {activeView === 'sources' && <SourcesView sources={sources} onReload={loadSources} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <MathBaseApp />
    </Suspense>
  )
}
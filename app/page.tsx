'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import { Button, Input } from '@/components/ui/Common'
import { theme } from '@/lib/core/theme'
import { DashboardView } from '@/components/features/dashboard/DashboardView'
import { EntriesView } from '@/components/features/entries/EntriesView'
import { DeletedItemsView } from '@/components/features/entries/DeletedItemsView'
import { ReadingView } from '@/components/features/entries/ReadingView'
import { Sparkles } from 'lucide-react'
import { useAppController } from '@/hooks/useAppController'

// Dynamic Imports
const GraphView = dynamic(() => import('@/components/features/graph/GraphView'), { ssr: false })
const EntryEditor = dynamic(() => import('@/components/features/entries/EntryEditor'), { ssr: false })
const SourcesView = dynamic(() => import('@/components/features/sources/SourcesView'), { ssr: false })

const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: ${theme.colors.background}; color: ${theme.colors.text}; margin: 0; font-family: ${theme.typography.sans}; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: ${theme.colors.background}; }
  ::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${theme.colors.textMuted}; }
  button { transition: all 0.15s; cursor: pointer; }
  button:hover { opacity: 0.85; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .row-hover-group:hover { background: #1e1e24 !important; }
  .katex-display { text-align: left !important; margin: 1em 0 !important; overflow-x: auto; overflow-y: hidden; }
  .katex-display > .katex { text-align: left !important; white-space: normal !important; }
  .monaco-editor { border-radius: 0 !important; }
`

function MathBaseApp() {
  const { state, refs, actions } = useAppController()

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0e0e10', color: '#e8e6df', overflow: 'hidden' }}>
      <Sidebar
        sidebarOpen={state.sidebarOpen}
        activeView={state.activeView}
        goToView={actions.goToView}
        deletedEntries={state.deletedItems}
        onNewEntry={() => { 
          actions.setEditorKey(k => k + 1)
          actions.setSelected(null)
          actions.setMode('new')
          actions.setActiveView('entry') 
        }}
        onToggleSidebar={() => actions.setSidebarOpen(!state.sidebarOpen)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* TOP BAR */}
        <div style={{ height: 64, borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.background, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, zIndex: 10 }}>
          <div style={{ flex: 1, maxWidth: 800, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Input
              ref={refs.searchInputRef}
              value={state.search} onChange={e => actions.setSearch(e.target.value)}
              placeholder="Search in your knowledge repository..." fullWidth
              onFocus={() => state.activeView !== 'entries' && actions.goToView('entries')}
            />
            
            {/* SEARCH MODE TOGGLE (SLIDER) */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(30, 30, 40, 0.5)',
                backdropFilter: 'blur(8px)',
                borderRadius: 999,
                position: 'relative',
                width: '230px',
                height: 38,
                cursor: 'pointer',
                border: `1px solid rgba(255, 255, 255, 0.05)`,
                boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.5)',
                userSelect: 'none',
                overflow: 'hidden',
                transition: 'border-color 0.3s ease'
              }}
              onClick={() => actions.setSearchMode(state.searchMode === 'text' ? 'semantic' : 'text')}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
            >
              {/* VARIABLE WIDTH PILL */}
              <div style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                left: state.searchMode === 'text' ? '7px' : '90px',
                width: state.searchMode === 'text' ? '70px' : '80px',
                background: `linear-gradient(135deg, ${theme.colors.accent} 0%, #e8bc5e 100%)`,
                borderRadius: 999,
                transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                boxShadow: `0 4px 15px ${theme.colors.accent}33`,
                zIndex: 1
              }} />
              
              <div style={{
                flex: 1, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                color: state.searchMode === 'text' ? '#000' : 'rgba(255, 255, 255, 0.4)',
                transition: 'color 0.4s ease',
                pointerEvents: 'none',
                mixBlendMode: state.searchMode === 'text' ? 'normal' : 'plus-lighter'
              }}>
                Text
              </div>
              <div style={{
                flex: 1, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                color: state.searchMode === 'semantic' ? '#000' : 'rgba(255, 255, 255, 0.4)',
                transition: 'color 0.4s ease',
                pointerEvents: 'none',
                mixBlendMode: state.searchMode === 'semantic' ? 'normal' : 'plus-lighter'
              }}>
                Semantic
              </div>
            </div>
          </div>
        </div>

        {/* VIEW AREA */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {state.mode === 'new' || state.mode === 'edit' ? (
            <EntryEditor
              key={state.editorKey}
              initial={state.selected || undefined}
              allEntries={state.entries}
              sources={state.sources}
              initialRelations={state.relations.filter(r => r.fromEntryId === state.selected?.id)}
              onSave={actions.handleSave}
              onCancel={() => { 
                actions.setMode('view')
                state.selected ? actions.selectEntry(state.selected) : actions.goToView('dashboard') 
              }}
            />
          ) : (
            <>
              {state.activeView === 'dashboard' && <DashboardView entries={state.entries} sources={state.sources} onSelectEntry={actions.selectEntry} onCreateEntry={() => actions.setMode('new')} />}

              {state.activeView === 'entries' && (
                <EntriesView
                  entries={state.filtered} loading={state.loading} search={state.search}
                  itemsPerPage={state.itemsPerPage} setItemsPerPage={actions.setItemsPerPage}
                  currentPage={state.currentPage} setCurrentPage={actions.setCurrentPage}
                  selectedIds={state.selectedEntryIds} setSelectedIds={actions.setSelectedEntryIds}
                  onSelectEntry={actions.selectEntry} onEditEntry={(e) => { actions.selectEntry(e); actions.setMode('edit') }}
                  onDeleteEntry={actions.handleDelete} onBulkDelete={actions.handleBulkDelete}
                  sortConfig={state.sortConfig} onSort={actions.handleSort}
                  showFilter={state.showFilterDropdown} setShowFilter={actions.setShowFilterDropdown}
                  activeTags={state.activeTags} setActiveTags={actions.setActiveTags}
                  activeTypes={state.activeTypes} setActiveTypes={actions.setActiveTypes}
                  activeTitles={state.activeTitles} setActiveTitles={actions.setActiveTitles}
                />
              )}

              {state.activeView === 'deleted' && (
                <DeletedItemsView
                  items={state.deletedItems} loading={state.loading}
                  itemsPerPage={state.itemsPerPage} setItemsPerPage={actions.setItemsPerPage}
                  currentPage={state.deletedPage} setCurrentPage={actions.setDeletedPage}
                  selectedIds={state.selectedDeletedIds} setSelectedIds={actions.setSelectedDeletedIds}
                  onRestore={actions.handleRestore} onPermanentDelete={actions.handlePermanentDelete}
                  onBulkRestore={actions.handleBulkRestoreDeleted} onBulkPermanentDelete={actions.handleBulkPermanentDelete} onDeleteAll={actions.handleDeleteAllPermanently}
                  sortConfig={state.sortConfig} onSort={actions.handleSort}
                  showFilter={state.showFilterDropdown} setShowFilter={actions.setShowFilterDropdown}
                  activeTags={state.activeTags} setActiveTags={actions.setActiveTags}
                  activeTypes={state.activeTypes} setActiveTypes={actions.setActiveTypes}
                  activeTitles={state.activeTitles} setActiveTitles={actions.setActiveTitles}
                />
              )}

              {state.activeView === 'entry' && state.selected && (
                <ReadingView
                  selected={state.selected} entries={state.entries} sources={state.sources} relations={state.relations}
                  showAI={state.showAI} setShowAI={actions.setShowAI} onEdit={() => actions.setMode('edit')}
                  onBack={() => window.history.back()} onSelectEntry={actions.selectEntry}
                  sortedEntries={state.filtered} aiWidth={state.aiWidth} onStartResizingAI={actions.startResizingAI}
                />
              )}

              {state.activeView === 'graph' && <GraphView entries={state.entries} relations={state.relations} selectedId={state.selected?.id} onSelect={(id) => { const e = state.entries.find(x => x.id === id); if (e) actions.selectEntry(e) }} />}
              {state.activeView === 'sources' && <SourcesView sources={state.sources} onReload={actions.refreshAll} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ background: '#0e0e10', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.accent }}>Initializing MathBase...</div>}>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <MathBaseApp />
    </Suspense>
  )
}
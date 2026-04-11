'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import { Button, Input } from '@/components/ui/Common'
import { SunMedium, Moon, Palette } from 'lucide-react'
import { theme } from '@/lib/core/theme'
import { DashboardView } from '@/components/features/dashboard/DashboardView'
import { EntriesView } from '@/components/features/entries/EntriesView'
import { DeletedItemsView } from '@/components/features/entries/DeletedItemsView'
import { ReadingView } from '@/components/features/entries/ReadingView'
import { useAppController, THEME_COLORS, AccentColor } from '@/hooks/useAppController'

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
  .row-hover-group:hover { background: ${theme.colors.surfaceHover} !important; }
  .katex-display { text-align: left !important; margin: 1em 0 !important; overflow-x: auto; overflow-y: hidden; }
  .katex-display > .katex { text-align: left !important; white-space: normal !important; }
  .monaco-editor { border-radius: 0 !important; }
  .glow-card { transition: all ${theme.animations.fast} !important; }
  .glow-card:hover { 
    border-color: ${theme.colors.accent} !important; 
    box-shadow: 0 4px 12px ${theme.colors.accent}22; 
    transform: translateY(-2px);
  }
`

function MathBaseApp() {
  const { state, refs, actions } = useAppController()
  const [showColorPicker, setShowColorPicker] = React.useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.colors.background, color: theme.colors.text, overflow: 'hidden' }}>
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
        <div style={{ height: 64, borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.background, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, zIndex: 100 }}>
          <div style={{ maxWidth: 400, flex: 1, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Input
              ref={refs.searchInputRef}
              value={state.search} onChange={e => actions.setSearch(e.target.value)}
              placeholder="Search in your knowledge repository..." fullWidth
              onFocus={() => state.activeView !== 'entries' && actions.goToView('entries')}
            />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', color: theme.colors.accent }}
                icon={<Palette size={20} />}
              />
              {showColorPicker && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} 
                    onClick={() => setShowColorPicker(false)} 
                  />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 110,
                    background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
                    borderRadius: 12, padding: 12, display: 'flex', gap: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    {Object.entries(THEME_COLORS).map(([name, colors]) => (
                      <button
                        key={name}
                        onClick={() => {
                          actions.changeAccentColor(name as AccentColor)
                          setShowColorPicker(false)
                        }}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', padding: 0, border: state.accentColor === name ? `2px solid ${theme.colors.text}` : 'none',
                          background: state.themeMode === 'dark' ? colors.dark : colors.light,
                          cursor: 'pointer', transition: 'transform 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={actions.toggleTheme}
              style={{ width: 40, height: 40, padding: 0, borderRadius: '50%' }}
              icon={state.themeMode === 'dark' ? <SunMedium size={20} /> : <Moon size={20} />}
            />
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
          ) : (state.selected && state.mode === 'view') ? (
            <ReadingView
              selected={state.selected} entries={state.entries} sources={state.sources} relations={state.relations}
              onEdit={() => actions.setMode('edit')}
              onBack={() => window.history.back()} 
              onSelectEntry={actions.selectEntry}
              sortedEntries={state.filtered}
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
    <Suspense fallback={<div style={{ background: theme.colors.background, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.accent }}>Initializing MathBase...</div>}>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <MathBaseApp />
    </Suspense>
  )
}
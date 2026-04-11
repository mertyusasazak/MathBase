'use client'

import { EntriesView } from '@/components/features/entry/EntriesView'
import { useAppController } from '@/hooks/useAppController'

export default function EntriesPage() {
  const { state, actions } = useAppController()
  
  return (
    <EntriesView
      entries={state.filtered} 
      loading={state.loading} 
      search={state.search}
      itemsPerPage={state.itemsPerPage} 
      setItemsPerPage={actions.setItemsPerPage}
      currentPage={state.currentPage} 
      setCurrentPage={actions.setCurrentPage}
      selectedIds={state.selectedEntryIds} 
      setSelectedIds={actions.setSelectedEntryIds}
      onSelectEntry={actions.selectEntry} 
      onEditEntry={(e: any) => actions.editEntry(e.id)}
      onDeleteEntry={actions.handleDelete} 
      onBulkDelete={actions.handleBulkDelete}
      sortConfig={state.sortConfig} 
      onSort={actions.handleSort}
      showFilter={state.showFilterDropdown} 
      setShowFilter={actions.setShowFilterDropdown}
      activeTags={state.activeTags} 
      setActiveTags={actions.setActiveTags}
      activeTypes={state.activeTypes} 
      setActiveTypes={actions.setActiveTypes}
      activeTitles={state.activeTitles} 
      setActiveTitles={actions.setActiveTitles}
    />
  )
}

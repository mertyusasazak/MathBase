'use client'

import { DeletedItemsView } from '@/components/features/entry/DeletedItemsView'
import { useAppController } from '@/hooks/useAppController'

export default function TrashPage() {
  const { state, actions } = useAppController()
  
  return (
    <DeletedItemsView
      items={state.deletedItems} 
      loading={state.loading}
      itemsPerPage={state.itemsPerPage} 
      setItemsPerPage={actions.setItemsPerPage}
      currentPage={state.deletedPage} 
      setCurrentPage={actions.setDeletedPage}
      selectedIds={state.selectedDeletedIds} 
      setSelectedIds={actions.setSelectedDeletedIds}
      onRestore={actions.handleRestore} 
      onPermanentDelete={actions.handlePermanentDelete}
      onBulkRestore={actions.handleBulkRestoreDeleted} 
      onBulkPermanentDelete={actions.handleBulkPermanentDelete} 
      onDeleteAll={actions.handleDeleteAllPermanently}
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

import { useState, useEffect, useCallback } from 'react'
import { Entry, Source, Relation, DeletedItem } from '@/types'

export function useMathBase() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/entries')
      const data = await res.json()
      setEntries(data)
    } catch (e) {
      console.error('Failed to load entries:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources')
      const data = await res.json()
      setSources(data)
    } catch (e) {
      console.error('Failed to load sources:', e)
    }
  }, [])

  const loadRelations = useCallback(async () => {
    try {
      const res = await fetch('/api/relations')
      const data = await res.json()
      setRelations(data)
    } catch (e) {
      console.error('Failed to load relations:', e)
    }
  }, [])

  const loadDeleted = useCallback(async () => {
    try {
      const res = await fetch('/api/deleted')
      const data = await res.json()
      setDeletedItems(data)
    } catch (e) {
      console.error('Failed to load deleted items:', e)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      loadEntries(),
      loadSources(),
      loadRelations(),
      loadDeleted()
    ])
    setLoading(false)
  }, [loadEntries, loadSources, loadRelations, loadDeleted])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return false
    try {
      await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      await refreshAll()
      return true
    } catch (e) {
      console.error('Delete failed:', e)
      return false
    }
  }

  const handleRestore = async (item: DeletedItem) => {
    try {
      const url = item.deletedItemType === 'source' ? `/api/sources/${item.id}` : `/api/entries/${item.id}`
      await fetch(url, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ isDeleted: false }) 
      })
      await refreshAll()
      return true
    } catch (e) {
      console.error('Restore failed:', e)
      return false
    }
  }

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!confirm('Are you sure you want to permanently delete this item?\nThis action cannot be undone.')) return false
    try {
      const url = item.deletedItemType === 'source' ? `/api/sources/permanent/${item.id}` : `/api/entries/permanent/${item.id}`
      await fetch(url, { method: 'DELETE' })
      await loadDeleted()
      return true
    } catch (e) {
      console.error('Permanent delete failed:', e)
      return false
    }
  }

  return {
    entries,
    sources,
    relations,
    deletedItems,
    loading,
    refreshAll,
    loadEntries,
    loadSources,
    loadRelations,
    loadDeleted,
    handleDelete,
    handleRestore,
    handlePermanentDelete
  }
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Entry, SourceOption, EntryOption, Relation } from '@/types'
import { RELATION_LABELS } from '@/lib/core/constants'

interface Props {
  initial?: Partial<Entry>
  allEntries?: EntryOption[]
  sources?: SourceOption[]
  initialRelations?: Relation[]
  onSave: (entry: Partial<Entry>, versionNote?: string) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

export const RELATION_TYPES = Object.keys(RELATION_LABELS)

export function useEntryEditor({ 
  initial, 
  allEntries = [], 
  sources = [], 
  initialRelations = [], 
  onSave, 
  onCancel, 
  onDelete 
}: Props) {
  // Basic content state
  const [type, setType] = useState(initial?.type || 'theorem')
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '')
  const [sourceId, setSourceId] = useState<number | null>(initial?.sourceId || null)
  const [pageRange, setPageRange] = useState(initial?.pageRange || '')
  
  // Relations state
  const [refs, setRefs] = useState<number[]>(initialRelations.map(r => r.toEntryId))
  const [refRelations, setRefRelations] = useState<Record<number, string>>(
    initialRelations.reduce((acc, r) => ({ ...acc, [r.toEntryId]: r.relationType }), {})
  )
  
  // UI Loading
  const [saving, setSaving] = useState(false)
  
  // Search state
  const [refSearch, setRefSearch] = useState('')
  const [activeRelType, setActiveRelType] = useState('uses')
  const [isRefSearchOpen, setIsRefSearchOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom')
  const searchContainerRef = useRef<HTMLDivElement>(null)
  
  // Layout state
  const [leftWidth, setLeftWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [versionNote, setVersionNote] = useState('')
  
  const editorRef = useRef<any>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Section visibility
  const [openSections, setOpenSections] = useState({
    sources: false,
    tags: false,
    relations: false
  })

  useEffect(() => {
    // Duplicate detection was removed with AI features.
    setDuplicates([])
  }, [title])


  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }))
  }

  const toggleRef = (id: number) => {
    setRefs(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  // Handle resizing
  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const offsetX = e.clientX - rect.left
      const newWidth = (offsetX / rect.width) * 100
      if (newWidth > 20 && newWidth < 80) setLeftWidth(newWidth)
    }
    const handleMouseUp = () => setIsResizing(false)

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Smart dropdown flip logic
  useEffect(() => {
    if (isRefSearchOpen && searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setDropdownPosition('top')
      } else {
        setDropdownPosition('bottom')
      }
    }
  }, [isRefSearchOpen])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(
        {
          id: initial?.id,
          type,
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          refs,
          sourceId: sourceId || null,
          pageRange,
        },
        versionNote || undefined
      )

      if (initial?.id) {
        for (const refId of refs) {
          const relType = refRelations[refId] || 'related_to'
          const existingRel = initialRelations?.find(r => r.toEntryId === refId)
          if (existingRel && existingRel.relationType === relType) continue

          try {
            await fetch('/api/relations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fromEntryId: initial.id,
                toEntryId: refId,
                relationType: relType,
              })
            })
          } catch { /* ignore */ }
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return {
    state: {
      type, title, content, tags, sourceId, pageRange,
      refs, refRelations, saving,
      refSearch, activeRelType, isRefSearchOpen, dropdownPosition,
      leftWidth, isResizing, duplicates, versionNote, openSections
    },
    refs: {
      editorRef, editorContainerRef, searchContainerRef, containerRef
    },
    actions: {
      setType, setTitle, setContent, setTags, setSourceId, setPageRange,
      setRefSearch, setActiveRelType, setIsRefSearchOpen, setVersionNote,
      toggleSection, toggleRef,
      startResizing, handleSave, onCancel, onDelete, setRefRelations
    }
  }
}

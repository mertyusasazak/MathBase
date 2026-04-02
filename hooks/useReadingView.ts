'use client'

import { useState, useMemo } from 'react'
import { Entry, Relation } from '@/types'
import { RELATION_LABELS } from '@/lib/core/constants'

interface ReadingViewLogicProps {
  selected: Entry
  entries: Entry[]
  relations: Relation[]
  sortedEntries: Entry[]
}

export function useReadingView({
  selected,
  entries,
  relations,
  sortedEntries
}: ReadingViewLogicProps) {
  const [expandKeywords, setExpandKeywords] = useState(false)

  // Memoized relation processing
  const { sections } = useMemo(() => {
    const outgoing = relations.filter(r => r.fromEntryId === selected.id)
    const incoming = relations.filter(r => r.toEntryId === selected.id)
    
    const sections: { label: string; entries: { entry: Entry; rel: string }[] }[] = []

    // Group outgoing by relation type
    const outByType: Record<string, Entry[]> = {}
    outgoing.forEach(r => {
      const e = entries.find(x => x.id === r.toEntryId)
      if (e) {
        if (!outByType[r.relationType]) outByType[r.relationType] = []
        outByType[r.relationType].push(e)
      }
    })
    
    Object.entries(outByType).forEach(([type, ents]) => {
      sections.push({ 
        label: RELATION_LABELS[type] || type.replace(/_/g, ' '), 
        entries: ents.map(e => ({ entry: e, rel: type })) 
      })
    })

    // Group incoming as "Used by"
    const usedByMap = new Map<number, Entry>()
    incoming.forEach(r => {
      const e = entries.find(x => x.id === r.fromEntryId)
      if (e) usedByMap.set(e.id, e)
    })
    
    if (usedByMap.size > 0) {
      sections.push({ 
        label: 'Used By', 
        entries: Array.from(usedByMap.values()).map(e => ({ entry: e, rel: 'used_by' })) 
      })
    }

    return { sections }
  }, [selected.id, entries, relations])

  // Memoized navigation
  const { prevEntry, nextEntry } = useMemo(() => {
    const currentIndex = sortedEntries.findIndex(e => e.id === selected.id)
    return {
      prevEntry: currentIndex > 0 ? sortedEntries[currentIndex - 1] : null,
      nextEntry: currentIndex < sortedEntries.length - 1 ? sortedEntries[currentIndex + 1] : null
    }
  }, [selected.id, sortedEntries])

  return {
    state: {
      expandKeywords,
      sections,
      prevEntry,
      nextEntry
    },
    actions: {
      setExpandKeywords
    }
  }
}

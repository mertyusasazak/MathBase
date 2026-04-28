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

  // Inverse labels for incoming relations
  const INVERSE_LABELS: Record<string, string> = {
    uses: 'Used By',
    example_of: 'Instances / Examples',
    generalizes: 'Generalized By',
    proof_depends_on: 'Proof Base for',
    related_to: 'Related (Incoming)',
    contrasts_with: 'Contrasted By'
  }

  // Memoized relation processing
  const { outgoing, incoming } = useMemo(() => {
    const rawOut = relations.filter(r => r.fromEntryId === selected.id)
    const rawIn = relations.filter(r => r.toEntryId === selected.id)
    
    const outgoing = rawOut.map(r => {
      const e = entries.find(x => x.id === r.toEntryId)
      return e ? { entry: e, rel: RELATION_LABELS[r.relationType] || r.relationType } : null
    }).filter(Boolean) as { entry: Entry; rel: string }[]

    const incoming = rawIn.map(r => {
      const e = entries.find(x => x.id === r.fromEntryId)
      return e ? { entry: e, rel: INVERSE_LABELS[r.relationType] || r.relationType } : null
    }).filter(Boolean) as { entry: Entry; rel: string }[]

    return { outgoing, incoming }
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
      outgoing,
      incoming,
      prevEntry,
      nextEntry
    },
    actions: {
      setExpandKeywords
    }
  }
}

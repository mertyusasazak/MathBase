'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { ReadingView } from '@/components/features/entry/ReadingView'
import { useAppController } from '@/hooks/useAppController'

export default function EntryPage() {
  const { id } = useParams()
  const { state, actions } = useAppController()
  
  const entry = state.entries.find((e: any) => e.id === parseInt(id as string))

  if (state.loading && !entry) return <div style={{ padding: 40, color: 'var(--accent)' }}>Loading entry...</div>
  if (!entry) return <div style={{ padding: 40 }}>Entry not found.</div>

  return (
    <ReadingView
      selected={entry} 
      entries={state.entries} 
      sources={state.sources} 
      relations={state.relations}
      onEdit={() => actions.editEntry(entry.id)}
      onBack={() => window.history.back()} 
      onSelectEntry={actions.selectEntry}
      sortedEntries={state.filtered}
    />
  )
}

'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppController } from '@/hooks/useAppController'

const EntryEditor = dynamic(() => import('@/components/features/entry/EntryEditor'), { ssr: false })

export default function EditEntryPage() {
  const { id } = useParams()
  const { state, actions } = useAppController()
  
  const entry = state.entries.find((e: any) => e.id === parseInt(id as string))

  if (state.loading && !entry) return <div style={{ padding: 40, color: 'var(--accent)' }}>Loading entry for editing...</div>
  if (!entry) return <div style={{ padding: 40 }}>Entry not found.</div>

  return (
    <EntryEditor
      key={`edit-${id}`}
      initial={entry}
      allEntries={state.entries}
      sources={state.sources}
      initialRelations={state.relations.filter(r => r.fromEntryId === entry.id)}
      onSave={actions.handleSave}
      onCancel={() => { 
        actions.setMode('view')
        window.history.back()
      }}
    />
  )
}

'use client'

import dynamic from 'next/dynamic'
import { useAppController } from '@/hooks/useAppController'

const EntryEditor = dynamic(() => import('@/components/features/entry/EntryEditor'), { ssr: false })

export default function NewEntryPage() {
  const { state, actions } = useAppController()
  
  return (
    <EntryEditor
      key={state.editorKey}
      allEntries={state.entries}
      sources={state.sources}
      initialRelations={[]}
      onSave={actions.handleSave}
      onCancel={() => { 
        actions.setMode('view')
        window.history.back()
      }}
    />
  )
}

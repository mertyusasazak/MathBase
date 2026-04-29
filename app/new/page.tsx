'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useAppController } from '@/hooks/useAppController'

const EntryEditor = dynamic(() => import('@/components/features/entry/EntryEditor'), { ssr: false })

export default function NewEntryPage() {
  const { state, actions } = useAppController()
  const searchParams = useSearchParams()
  const sourceId = searchParams.get('sourceId')
  
  return (
    <EntryEditor
      key={state.editorKey}
      initial={sourceId ? { sourceId: parseInt(sourceId) } : {}}
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

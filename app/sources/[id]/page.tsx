'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import SourceDetailView from '@/components/features/sources/SourceDetailView'

export default function SourceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { state, actions } = useAppContext()

  const sourceId = parseInt(params.id as string)
  const source = state.sources.find((s: any) => s.id === sourceId)

  // Filter entries that belong to this source
  const sourceEntries = state.entries.filter((e: any) => e.sourceId === sourceId)

  if (!source) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Source not found</h2>
        <button onClick={() => router.push('/sources')}>Go back to sources</button>
      </div>
    )
  }

  return (
    <SourceDetailView 
      source={source} 
      entries={sourceEntries} 
      allEntries={state.entries}
      onBack={() => router.push('/sources')}
      onSelectEntry={(e) => actions.selectEntry(e)}
      onReload={actions.refreshAll}
    />
  )
}

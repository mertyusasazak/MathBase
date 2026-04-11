'use client'

import dynamic from 'next/dynamic'
import { useAppController } from '@/hooks/useAppController'

const GraphView = dynamic(() => import('@/components/features/graph/GraphView'), { ssr: false })

export default function GraphPage() {
  const { state, actions } = useAppController()
  
  return (
    <GraphView 
      entries={state.entries} 
      relations={state.relations} 
      selectedId={state.selected?.id} 
      onSelect={(id: number) => { 
        const e = state.entries.find(x => x.id === id); 
        if (e) actions.selectEntry(e) 
      }} 
    />
  )
}

'use client'

import dynamic from 'next/dynamic'
import { useAppController } from '@/hooks/useAppController'

const SourcesView = dynamic(() => import('@/components/features/sources/SourcesView'), { ssr: false })

export default function SourcesPage() {
  const { state, actions } = useAppController()
  
  return (
    <SourcesView 
      sources={state.sources} 
      onReload={actions.refreshAll} 
      onSelectSource={actions.selectSource}
    />
  )
}

'use client'

import { DashboardView } from '@/components/features/dashboard/DashboardView'
import { useAppController } from '@/hooks/useAppController'

export default function DashboardPage() {
  const { state, actions } = useAppController()
  
  return (
    <DashboardView 
      entries={state.entries} 
      sources={state.sources} 
      onSelectEntry={actions.selectEntry} 
      onCreateEntry={() => actions.goToView('new')} 
    />
  )
}

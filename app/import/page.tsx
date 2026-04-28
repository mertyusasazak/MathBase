'use client'

import React from 'react'
import SmartImportView from '@/components/features/import/SmartImportView'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const router = useRouter()

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <SmartImportView 
        onClose={() => router.push('/dashboard')} 
        onComplete={() => router.push('/sources')} 
      />
    </div>
  )
}

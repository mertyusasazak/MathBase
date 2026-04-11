'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Automatically redirect to the dashboard as the starting view
    router.replace('/dashboard')
  }, [router])

  return null
}
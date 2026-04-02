// app/api/ai/suggest-refs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'
import { suggestRefs } from '@/lib/services/ai'

export async function POST(req: NextRequest) {
  const { title, content, currentId } = await req.json()

  const all = await prisma.entry.findMany({
    select: { id: true, type: true, title: true, tags: true }
  })

  // Kendisini hariç tut
  const candidates = all
    .filter(e => e.id !== currentId)
    .map(e => ({ ...e, tags: JSON.parse(e.tags || '[]') }))

  const refIds = await suggestRefs(title, content, candidates)
  return NextResponse.json({ refs: refIds })
}

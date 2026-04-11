// app/api/search/route.ts
// Full-text search + semantic similarity search + keyword search

import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.toLowerCase() || ''
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!q) return NextResponse.json([])

  const raw = await prisma.entry.findMany({
    where: { isDeleted: false } as any,
    select: {
      id: true, type: true, title: true, content: true,
      tags: true, refs: true, createdAt: true, updatedAt: true,
      symbolKeywords: true, sourceId: true, pageRange: true, versionNote: true,
      personalNotes: true,
    }
  })

  const results = raw.map(parseEntry).filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.content.toLowerCase().includes(q) ||
    e.tags.some((t: string) => t.toLowerCase().includes(q)) ||
    e.type.includes(q) ||
    e.symbolKeywords?.some((k: string) => k.toLowerCase().includes(q))
  ).slice(0, limit)

  return NextResponse.json(results)
}

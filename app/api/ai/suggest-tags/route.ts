// app/api/ai/suggest-tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'
import { suggestTags } from '@/lib/services/ai'

export async function POST(req: NextRequest) {
  const { title, content } = await req.json()

  // Mevcut tüm unique tag'leri topla
  const all = await prisma.entry.findMany({ select: { tags: true } })
  const allTags = [...new Set(all.flatMap(e => JSON.parse(e.tags || '[]') as string[]))]

  const suggested = await suggestTags(title, content, allTags)
  return NextResponse.json({ tags: suggested })
}

// app/api/entry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'
import { extractKeywords } from '@/lib/utils'

// GET /api/entry - Tüm entry'leri listele
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tag = searchParams.get('tag')
  const type = searchParams.get('type')

  const raw = await prisma.entry.findMany({
    where: { isDeleted: false } as any,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, type: true, title: true, content: true,
      tags: true, refs: true, createdAt: true, updatedAt: true,
      versionNote: true,
      sourceId: true, pageRange: true, symbolKeywords: true, personalNotes: true,
    }
  })

  let entries = raw.map(parseEntry)

  if (tag) entries = entries.filter(e => e.tags.includes(tag))
  if (type) entries = entries.filter(e => e.type === type)

  return NextResponse.json(entries)
}

// POST /api/entry - Yeni entry oluştur
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, title, content, tags, refs, versionNote, sourceId, pageRange } = body

  if (!title || !type) {
    return NextResponse.json({ error: 'title and type are required' }, { status: 400 })
  }

  // Auto-extract keywords
  const symbolKeywords = extractKeywords(title + ' ' + (content || ''))

  const entry = await prisma.entry.create({
    data: {
      type,
      title,
      content: content || '',
      tags: JSON.stringify(tags || []),
      refs: JSON.stringify(refs || []),
      symbolKeywords: JSON.stringify(symbolKeywords),
      versionNote: versionNote || 'Initial version',
      sourceId: sourceId || null,
      pageRange: pageRange || '',
    }
  })

  // İlk versiyonu kaydet
  await prisma.entryVersion.create({
    data: {
      entryId: entry.id,
      type: entry.type,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      refs: entry.refs,
      note: versionNote || 'Initial version'
    }
  })

  return NextResponse.json(parseEntry(entry), { status: 201 })
}

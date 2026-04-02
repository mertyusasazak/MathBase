// app/api/entries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry, cleanOrphanRefs } from '@/lib/core/db'
import { computeSimpleEmbedding } from '@/lib/services/ai'
import { extractKeywords } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { savedAt: 'desc' }, take: 20 },
      source: true,
    }
  })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(parseEntry(entry))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const body = await req.json()
  const { type, title, content, tags, refs, versionNote, sourceId, pageRange, isDeleted } = body

  // Mevcut entry'i bul
  const existing = await prisma.entry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If this is just a restore operation (only isDeleted changed), skip version/embedding
  if (isDeleted !== undefined && !type && !title && content === undefined && !tags && !refs) {
    const updated = await prisma.entry.update({
      where: { id },
      data: { isDeleted }
    })
    return NextResponse.json(parseEntry(updated))
  }

  // Kaydetmeden önce versiyon oluştur
  await prisma.entryVersion.create({
    data: {
      entryId: id,
      type: existing.type,
      title: existing.title,
      content: existing.content,
      tags: existing.tags,
      refs: existing.refs,
      note: versionNote || 'Auto-saved'
    }
  })

  // Embedding güncelle
  const embedding = computeSimpleEmbedding((title || existing.title) + ' ' + (content || existing.content))

  // Re-extract keywords
  const symbolKeywords = extractKeywords((title || existing.title) + ' ' + (content || existing.content))

  const updated = await prisma.entry.update({
    where: { id },
    data: {
      ...(type && { type }),
      ...(title && { title }),
      ...(content !== undefined && { content }),
      ...(tags && { tags: JSON.stringify(tags) }),
      ...(refs && { refs: JSON.stringify(refs) }),
      ...(versionNote !== undefined && { versionNote }),
      ...(sourceId !== undefined && { sourceId: sourceId || null }),
      ...(pageRange !== undefined && { pageRange }),
      ...(isDeleted !== undefined && { isDeleted }),
      embedding: JSON.stringify(embedding),
      symbolKeywords: JSON.stringify(symbolKeywords),
    }
  })

  return NextResponse.json(parseEntry(updated))
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)

  await prisma.entry.update({
    where: { id },
    data: { isDeleted: true } as any
  })

  return NextResponse.json({ success: true })
}

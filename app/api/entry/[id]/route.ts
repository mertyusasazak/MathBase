// app/api/entry/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry} from '@/lib/core/db'
import { extractKeywords } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      source: true,
    }
  })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(parseEntry(entry))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const body = await req.json()
  const { type, title, content, tags, refs, relationData, sourceId, pageRange, isDeleted, personalNotes } = body

  // Mevcut entry'i bul
  const existing = await prisma.entry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fast-path for Personal Notes (skip keywords)
  if (personalNotes !== undefined && !type && !title && content === undefined && !tags && !refs && isDeleted === undefined) {
    try {
      const updated = await prisma.entry.update({
        where: { id },
        data: { personalNotes }
      })
      return NextResponse.json(parseEntry(updated))
    } catch (err: any) {
      return NextResponse.json({ error: 'Failed to update personal notes: ' + err.message }, { status: 500 })
    }
  }

  // Fast-path for Restore operation
  if (isDeleted !== undefined && !type && !title && content === undefined && !tags && !refs) {
    const updated = await prisma.entry.update({
      where: { id },
      data: { isDeleted }
    })
    return NextResponse.json(parseEntry(updated))
  }

  // Relation senkronizasyonu
  if (refs && Array.isArray(refs)) {
    // Mevcut ilişkileri getir
    const existingRelations = await prisma.relation.findMany({
      where: { fromEntryId: id }
    })

    const existingToIds = existingRelations.map(r => r.toEntryId)

    // Silinenler
    const toDelete = existingRelations.filter(r => !refs.includes(r.toEntryId))
    for (const r of toDelete) {
      await prisma.relation.delete({ where: { id: r.id } })
    }

    // Eklenenler veya güncellenenler
    for (const refId of refs) {
      const relType = relationData?.[refId] || 'related_to'
      const existingRel = existingRelations.find(r => r.toEntryId === refId)

      if (existingRel) {
        if (existingRel.relationType !== relType) {
          await prisma.relation.update({
            where: { id: existingRel.id },
            data: { relationType: relType }
          })
        }
      } else {
        await prisma.relation.create({
          data: {
            fromEntryId: id,
            toEntryId: refId,
            relationType: relType,
            createdBy: 'user'
          }
        })
      }
    }
  }

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
      ...(sourceId !== undefined && { sourceId: sourceId || null }),
      ...(pageRange !== undefined && { pageRange }),
      ...(isDeleted !== undefined && { isDeleted }),
      ...(personalNotes !== undefined && { personalNotes }),
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

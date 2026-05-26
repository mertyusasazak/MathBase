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
  const { type, title, content, tags, refs, relationData, relations, sourceId, pageRange } = body

  if (!title || !type) {
    return NextResponse.json({ error: 'title and type are required' }, { status: 400 })
  }

  // Use manual keywords if provided, otherwise auto-extract
  const finalKeywords = body.manualKeywords || extractKeywords(title + ' ' + (content || ''))

  const entry = await prisma.entry.create({
    data: {
      type,
      title,
      content: content || '',
      tags: JSON.stringify(tags || []),
      refs: JSON.stringify(refs || []),
      symbolKeywords: JSON.stringify(finalKeywords),
      sourceId: sourceId || null,
      pageRange: pageRange || '',
    }
  })

  // Relation tablosuna kaydet
  if (refs && Array.isArray(refs)) {
    for (const refId of refs) {
      await prisma.relation.create({
        data: {
          fromEntryId: entry.id,
          toEntryId: refId,
          relationType: relationData?.[refId] || 'related_to',
          createdBy: 'user'
        }
      })
    }
  }

  // Structured Relations (e.g. from Smart Import)
  if (relations && Array.isArray(relations)) {
    for (const rel of relations) {
      const targetId = rel.toEntryId
      if (!targetId || targetId === entry.id) continue

      const exists = await prisma.relation.findFirst({
        where: { fromEntryId: entry.id, toEntryId: targetId }
      })

      if (!exists) {
        await prisma.relation.create({
          data: {
            fromEntryId: entry.id,
            toEntryId: targetId,
            relationType: rel.relationType || 'related_to',
            confidence: rel.confidence || 1.0,
            createdBy: 'system'
          }
        })
      }
    }
  }

  // Başlığa göre ilişki kurma (Smart Import desteği)
  const { relationTitles } = body
  if (relationTitles && Array.isArray(relationTitles)) {
    for (const rTitle of relationTitles) {
      // Bu başlığa sahip bir entry bul (isDeleted=false olanları tercih et)
      const target = await prisma.entry.findFirst({
        where: { title: rTitle, isDeleted: false }
      })
      
      if (target && target.id !== entry.id) {
        // Zaten bir ilişki var mı kontrol et (çift kayıt önlemek için)
        const exists = await prisma.relation.findFirst({
          where: {
            fromEntryId: entry.id,
            toEntryId: target.id
          }
        })
        
        if (!exists) {
          await prisma.relation.create({
            data: {
              fromEntryId: entry.id,
              toEntryId: target.id,
              relationType: 'related_to',
              createdBy: 'system'
            }
          })
          
          // Opsiyonel: Çift yönlü ilişki kurma
          const reverseExists = await prisma.relation.findFirst({
            where: { fromEntryId: target.id, toEntryId: entry.id }
          })
          if (!reverseExists) {
            await prisma.relation.create({
              data: {
                fromEntryId: target.id,
                toEntryId: entry.id,
                relationType: 'related_to',
                createdBy: 'system'
              }
            })
          }
        }
      }
    }
  }

  return NextResponse.json(parseEntry(entry), { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'merge' // 'merge' veya 'replace'
    
    const body = await req.json()
    
    if (!body || body.version !== '1.0') {
      return NextResponse.json({ error: 'Geçersiz veya desteklenmeyen JSON formatı. (version: "1.0" bekleniyor)' }, { status: 400 })
    }

    const { entries = [], sources = [], relations = [], tags = [] } = body

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // REPLACE MODU: Veritabanını tamamen temizle
    if (mode === 'replace') {
      // Prisma'nın SQLite üzerinde deleteMany ile cascade yaparken sorun yaşamaması için sondan başa silme
      await prisma.relation.deleteMany()
      await prisma.entry.deleteMany()
      await prisma.source.deleteMany()
      await prisma.tag.deleteMany()
    }

    // ID haritalamaları (Eski ID -> Yeni ID)
    const sourceMap = new Map<number, number>()
    const entryMap = new Map<number, number>()

    // 1. Tags Yükleme
    for (const t of tags) {
      try {
        const existing = await prisma.tag.findUnique({ where: { name: t.name } })
        if (existing) {
          if (mode === 'merge') {
            skipped++
            continue
          }
        }
        await prisma.tag.create({
          data: {
            name: t.name,
            parent: t.parent || '',
            color: t.color || ''
          }
        })
        imported++
      } catch (err: any) {
        errors.push(`Tag "${t.name}" hatası: ${err.message}`)
      }
    }

    // 2. Sources Yükleme
    for (const s of sources) {
      try {
        let existing = null
        if (mode === 'merge') {
          existing = await prisma.source.findFirst({
            where: { title: s.title, sourceType: s.sourceType }
          })
        }
        
        if (existing) {
          await prisma.source.update({
            where: { id: existing.id },
            data: {
              filepath: s.filepath || '',
              pageRange: s.pageRange || '',
              bibInfo: s.bibInfo || '',
              isDeleted: Boolean(s.isDeleted),
            }
          })
          sourceMap.set(s.id, existing.id)
          imported++
        } else {
          const created = await prisma.source.create({
            data: {
              title: s.title,
              sourceType: s.sourceType,
              filepath: s.filepath || '',
              pageRange: s.pageRange || '',
              bibInfo: s.bibInfo || '',
              isDeleted: Boolean(s.isDeleted),
              createdAt: s.createdAt ? new Date(s.createdAt) : undefined
            }
          })
          sourceMap.set(s.id, created.id)
          imported++
        }
      } catch (err: any) {
        errors.push(`Source "${s.title}" hatası: ${err.message}`)
      }
    }

    // 3. Entries Yükleme
    for (const e of entries) {
      try {
        let existing = null
        if (mode === 'merge') {
          existing = await prisma.entry.findFirst({
            where: { title: e.title, type: e.type }
          })
        }

        const newSourceId = e.sourceId ? sourceMap.get(e.sourceId) || null : null

        if (existing) {
          // Üzerine yaz ve updatedAt'i şu anki zamana çek
          await prisma.entry.update({
            where: { id: existing.id },
            data: {
              content: e.content || '',
              tags: Array.isArray(e.tags) ? JSON.stringify(e.tags) : '[]',
              refs: Array.isArray(e.refs) ? JSON.stringify(e.refs) : '[]',
              symbolKeywords: Array.isArray(e.symbolKeywords) ? JSON.stringify(e.symbolKeywords) : '[]',
              sourceId: newSourceId,
              pageRange: e.pageRange || '',
              isDeleted: Boolean(e.isDeleted),
              updatedAt: new Date(), // Her zaman güncellendiğini belirt
            }
          })
          entryMap.set(e.id, existing.id)
          imported++
        } else {
          // Yeni oluştur
          const created = await prisma.entry.create({
            data: {
              type: e.type,
              title: e.title,
              content: e.content || '',
              tags: Array.isArray(e.tags) ? JSON.stringify(e.tags) : '[]',
              refs: Array.isArray(e.refs) ? JSON.stringify(e.refs) : '[]',
              symbolKeywords: Array.isArray(e.symbolKeywords) ? JSON.stringify(e.symbolKeywords) : '[]',
              sourceId: newSourceId,
              pageRange: e.pageRange || '',
              isDeleted: Boolean(e.isDeleted),
              createdAt: e.createdAt ? new Date(e.createdAt) : undefined,
              updatedAt: new Date(), // Her zaman güncellendiğini belirt
            }
          })
          entryMap.set(e.id, created.id)
          imported++
        }
      } catch (err: any) {
        errors.push(`Entry "${e.title}" hatası: ${err.message}`)
      }
    }

    // 4. Relations Yükleme
    for (const r of relations) {
      try {
        const fromId = entryMap.get(r.fromEntryId)
        const toId = entryMap.get(r.toEntryId)

        if (!fromId || !toId) {
          // İlişkideki girişlerden biri yüklenemediyse veya bulunamadıysa atla
          continue
        }

        // Kopya kontrolü (Aynı bağlantı var mı?)
        const existing = await prisma.relation.findFirst({
          where: { fromEntryId: fromId, toEntryId: toId, relationType: r.relationType }
        })

        if (existing) {
          skipped++
        } else {
          await prisma.relation.create({
            data: {
              fromEntryId: fromId,
              toEntryId: toId,
              relationType: r.relationType,
              confidence: Number(r.confidence) || 1.0,
              createdBy: r.createdBy || 'import',
              createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
            }
          })
          imported++
        }
      } catch (err: any) {
        errors.push(`Relation hatası: ${err.message}`)
      }
    }

    return NextResponse.json({ imported, skipped, errors })
    
  } catch (err: any) {
    return NextResponse.json({ error: 'Geri yükleme başarısız oldu: ' + err.message }, { status: 500 })
  }
}

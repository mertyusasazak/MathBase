import { NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    let entries: any[], sources: any[], relations: any[], tags: any[]

    if (id) {
      const entryId = parseInt(id)
      const entry = await prisma.entry.findUnique({ where: { id: entryId } })
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      
      entries = [entry]
      const source = entry.sourceId ? await prisma.source.findUnique({ where: { id: entry.sourceId } }) : null
      sources = source ? [source] : []
      relations = await prisma.relation.findMany({
        where: {
          OR: [
            { fromEntryId: entryId },
            { toEntryId: entryId }
          ]
        }
      })
      
      const entryTags = JSON.parse(entry.tags || '[]')
      tags = await prisma.tag.findMany({
        where: { name: { in: entryTags } }
      })
    } else {
      entries = await prisma.entry.findMany({ where: { isDeleted: false } })
      sources = await prisma.source.findMany({ where: { isDeleted: false } })
      relations = await prisma.relation.findMany()
      tags = await prisma.tag.findMany()
    }

    // Process entries to parse JSON fields
    const processedEntries = entries.map(e => ({
      ...e,
      tags: JSON.parse(e.tags || '[]'),
      refs: JSON.parse(e.refs || '[]'),
      symbolKeywords: JSON.parse(e.symbolKeywords || '[]'),
    }))

    // Resolve titles for relations to make JSON human-readable
    const relationIds = relations.flatMap(r => [r.fromEntryId, r.toEntryId])
    const involvedEntries = await prisma.entry.findMany({
      where: { id: { in: relationIds } },
      select: { id: true, title: true }
    })
    const titleMap = Object.fromEntries(involvedEntries.map(e => [e.id, e.title]))

    const processedRelations = relations.map(r => ({
      ...r,
      fromTitle: titleMap[r.fromEntryId] || 'Unknown',
      toTitle: titleMap[r.toEntryId] || 'Unknown'
    }))

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      entries: processedEntries,
      sources,
      relations: processedRelations,
      tags
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const dateStr = new Date().toISOString().split('T')[0]
    
    let filename = `mathbase-${dateStr}.json`
    if (id && entries.length > 0) {
      const safeTitle = entries[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      filename = `${safeTitle}-${dateStr}.json`
    }

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 })
  }
}

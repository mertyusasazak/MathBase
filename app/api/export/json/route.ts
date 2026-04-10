import { NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

export async function GET() {
  try {
    const entries = await prisma.entry.findMany({ where: { isDeleted: false } })
    const sources = await prisma.source.findMany({ where: { isDeleted: false } })
    const relations = await prisma.relation.findMany()
    const tags = await prisma.tag.findMany()

    // Process entries to parse JSON fields
    const processedEntries = entries.map(e => ({
      ...e,
      tags: JSON.parse(e.tags || '[]'),
      refs: JSON.parse(e.refs || '[]'),
      embedding: JSON.parse(e.embedding || '[]'),
      symbolKeywords: JSON.parse(e.symbolKeywords || '[]'),
      chatHistory: JSON.parse(e.chatHistory || '[]'),
    }))

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      entries: processedEntries,
      sources,
      relations,
      tags
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const dateStr = new Date().toISOString().split('T')[0]

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mathbase-${dateStr}.json"`
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 })
  }
}

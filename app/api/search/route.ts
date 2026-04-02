// app/api/search/route.ts
// Full-text search + semantic similarity search + keyword search

import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'
import { computeSimpleEmbedding, cosineSimilarity } from '@/lib/services/ai'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.toLowerCase() || ''
  const mode = searchParams.get('mode') || 'text' // 'text' | 'semantic' | 'combined'
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!q) return NextResponse.json([])

  const all = await prisma.entry.findMany({
    select: {
      id: true, type: true, title: true, content: true,
      tags: true, refs: true, createdAt: true, updatedAt: true,
      embedding: true, symbolKeywords: true,
      sourceId: true, pageRange: true, versionNote: true,
    }
  })

  const parsed = all.map(e => ({ ...parseEntry(e), rawEmbedding: e.embedding }))

  let results: any[]

  if (mode === 'semantic' || mode === 'combined') {
    // Semantic: sorgu vektörü ile cosine similarity
    const queryVec = computeSimpleEmbedding(q)

    const scored = parsed.map(e => {
      let entryVec: number[] = JSON.parse(e.rawEmbedding || '[]')
      if (entryVec.length === 0) {
        entryVec = computeSimpleEmbedding(e.title + ' ' + e.content)
      }
      const semanticScore = entryVec.length ? cosineSimilarity(queryVec, entryVec) : 0

      // Text match score (now includes symbolKeywords)
      const keywordsMatch = e.symbolKeywords?.some((k: string) => k.toLowerCase().includes(q)) ? 0.2 : 0
      const textScore =
        (e.title.toLowerCase().includes(q) ? 0.3 : 0) +
        (e.content.toLowerCase().includes(q) ? 0.2 : 0) +
        (e.tags.some((t: string) => t.includes(q)) ? 0.2 : 0) +
        keywordsMatch

      const finalScore = mode === 'combined'
        ? semanticScore * 0.6 + textScore * 0.4
        : semanticScore

      return { ...e, _score: finalScore, rawEmbedding: undefined }
    })

    results = scored
      .filter(e => e._score > 0.05)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)

  } else {
    // Pure text search (now includes symbolKeywords)
    results = parsed.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some((t: string) => t.toLowerCase().includes(q)) ||
      e.type.includes(q) ||
      e.symbolKeywords?.some((k: string) => k.toLowerCase().includes(q))
    ).map(e => ({ ...e, rawEmbedding: undefined }))
      .slice(0, limit)
  }

  return NextResponse.json(results)
}

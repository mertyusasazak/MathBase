// app/api/search/route.ts
// Full-text search + semantic similarity search + keyword search

import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'
import { findSimilar } from '@/lib/core/tfidf'

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
      symbolKeywords: true, sourceId: true, pageRange: true, versionNote: true,
    }
  })

  const parsed = all.map(parseEntry)

  let results: any[]

  if (mode === 'semantic' || mode === 'combined') {
    // TF-IDF tabanlı semantic arama (findSimilar) kullanımı
    // Combined mode'da her kaydın skorunu bilmemiz gerektiği için limiti parsed.length olarak veriyoruz
    const similarScores = findSimilar(q, parsed, parsed.length)
    
    // O(1) erişim için ID'ye göre skorları eşle
    const scoreMap = new Map<number, number>()
    similarScores.forEach(s => scoreMap.set(s.entry.id, s.score))

    const scored = parsed.map(e => {
      const semanticScore = scoreMap.get(e.id) || 0

      // Eski text match score (symbolKeywords dahil)
      const keywordsMatch = e.symbolKeywords?.some((k: string) => k.toLowerCase().includes(q)) ? 0.2 : 0
      const textScore =
        (e.title.toLowerCase().includes(q) ? 0.3 : 0) +
        (e.content.toLowerCase().includes(q) ? 0.2 : 0) +
        (e.tags.some((t: string) => t.includes(q)) ? 0.2 : 0) +
        keywordsMatch

      const finalScore = mode === 'combined'
        ? semanticScore * 0.6 + textScore * 0.4
        : semanticScore

      return { ...e, _score: finalScore }
    })

    results = scored
      .filter(e => e._score > 0.02) // Düşük skorluları filtrele
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

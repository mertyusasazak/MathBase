// lib/db.ts
// Next.js dev modunda hot reload sırasında birden fazla
// Prisma Client instance açılmasını önleyen singleton pattern

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ─── Helper Types ────────────────────────────────────────────────────────────

export type EntryType =
  | 'definition'
  | 'theorem'
  | 'lemma'
  | 'corollary'
  | 'example'
  | 'remark'

export interface EntryRow {
  id: number
  type: string
  title: string
  content: string
  tags: string[]      // parsed
  refs: number[]      // parsed
  sourceId: number | null
  pageRange: string
  symbolKeywords: string[]  // parsed
  personalNotes: string
  createdAt: Date
  updatedAt: Date
}

// DB'den gelen raw satırı parse eder
export function parseEntry(raw: any): EntryRow {
  return {
    ...raw,
    tags: JSON.parse(raw.tags || '[]'),
    refs: JSON.parse(raw.refs || '[]'),
    symbolKeywords: JSON.parse(raw.symbolKeywords || '[]'),
  }
}

// Bir entry'nin tüm refs'lerini temizle (silme sonrası cascade)
export async function cleanOrphanRefs(deletedId: number) {
  const all = await prisma.entry.findMany({ select: { id: true, refs: true } })
  for (const e of all) {
    const refs: number[] = JSON.parse(e.refs || '[]')
    if (refs.includes(deletedId)) {
      await prisma.entry.update({
        where: { id: e.id },
        data: { refs: JSON.stringify(refs.filter(r => r !== deletedId)) }
      })
    }
  }
}

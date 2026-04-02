// app/api/ai/explain/route.ts
// Streaming endpoint - entry hakkında soru sorabilirsin
console.log('GEMINI KEY:', process.env.GEMINI_API_KEY)

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/core/db'
import { explainEntry } from '@/lib/services/ai'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { entryId, question } = await req.json()

  const entry = await prisma.entry.findUnique({ where: { id: entryId } })
  if (!entry) {
    return new Response('Entry not found', { status: 404 })
  }

  const stream = await explainEntry(
    { type: entry.type, title: entry.title, content: entry.content },
    question
  )

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  })
}

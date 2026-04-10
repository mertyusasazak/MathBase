// app/api/duplicates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { findDuplicates } from '@/lib/utils'

// POST /api/duplicates — check for similar existing entries
export async function POST(req: NextRequest) {
    const { title, content, excludeId } = await req.json()

    if (!title && !content) {
        return NextResponse.json({ duplicates: [] })
    }

    const allEntries = await prisma.entry.findMany({
        select: { id: true, title: true, type: true, content: true }
    })

    const duplicates = findDuplicates(title || '', content || '', allEntries, excludeId)

    return NextResponse.json({ duplicates })
}

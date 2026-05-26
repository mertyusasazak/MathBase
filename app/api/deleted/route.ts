import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'

export async function GET() {
    const [rawEntries, sources] = await Promise.all([
        prisma.entry.findMany({
            where: { isDeleted: true },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true, type: true, title: true, content: true,
                tags: true, refs: true, createdAt: true, updatedAt: true,
                sourceId: true, pageRange: true, symbolKeywords: true,
            }
        }),
        prisma.source.findMany({
            where: { isDeleted: true },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { entries: true } }
            }
        })
    ])

    // Map elements into a unified DeletedItem interface format expected by the frontend
    const deletedEntries = rawEntries.map(e => {
        const parsed = parseEntry(e)
        return { ...parsed, deletedItemType: 'entry' }
    })

    const deletedSources = sources.map(s => ({
        ...s,
        deletedItemType: 'source'
    }))

    const combined = [...deletedEntries, ...deletedSources].sort((a, b) => {
        const dA = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : new Date((a as any).createdAt).getTime()
        const dB = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : new Date((b as any).createdAt).getTime()
        return dB - dA
    })

    return NextResponse.json(combined)
}

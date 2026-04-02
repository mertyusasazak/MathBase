import { NextRequest, NextResponse } from 'next/server'
import { prisma, cleanOrphanRefs } from '@/lib/core/db'

export async function DELETE(req: NextRequest) {
    try {
        // Find all soft-deleted entries and sources
        const deletedEntries = await prisma.entry.findMany({
            where: { isDeleted: true },
            select: { id: true }
        })
        const deletedSources = await prisma.source.findMany({
            where: { isDeleted: true },
            select: { id: true }
        })

        const entryIds = deletedEntries.map(e => e.id)

        // Clean orphan refs for entries
        for (const id of entryIds) await cleanOrphanRefs(id)

        // Delete related relations
        if (entryIds.length > 0) {
            await prisma.relation.deleteMany({
                where: { OR: [{ fromEntryId: { in: entryIds } }, { toEntryId: { in: entryIds } }] }
            })
            await prisma.entry.deleteMany({
                where: { id: { in: entryIds } }
            })
        }

        // Delete sources
        const sourceIds = deletedSources.map(s => s.id)
        if (sourceIds.length > 0) {
            await prisma.source.deleteMany({
                where: { id: { in: sourceIds } }
            })
        }

        return NextResponse.json({ success: true, count: entryIds.length + sourceIds.length })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Bulk permanent delete failed' }, { status: 500 })
    }
}

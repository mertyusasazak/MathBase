import { NextRequest, NextResponse } from 'next/server'
import { prisma, cleanOrphanRefs } from '@/lib/core/db'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    try {
        // Technically, regular delete completely drops the item from the DB because of cascade.
        // It's already permanent in the backend. 
        // We will just clear orphan refs to be safe and delete it if it miraculously survived.

        await cleanOrphanRefs(id)

        await prisma.relation.deleteMany({
            where: { OR: [{ fromEntryId: id }, { toEntryId: id }] }
        })

        try {
            await prisma.entry.delete({ where: { id } })
        } catch {
            // Already deleted (usual case, since we do local-state "recent deleted")
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Permanent delete failed' }, { status: 500 })
    }
}

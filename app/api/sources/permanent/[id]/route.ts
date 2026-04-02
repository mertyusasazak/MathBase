// app/api/sources/permanent/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    try {
        // Permanently delete the source from the database
        try {
            await prisma.source.delete({ where: { id } })
        } catch {
            // Already deleted
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Permanent delete failed' }, { status: 500 })
    }
}

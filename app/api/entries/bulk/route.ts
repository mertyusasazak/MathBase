// app/api/entries/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

// DELETE /api/entries/bulk — soft-delete multiple entries at once
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json()
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
        }

        // Soft delete: only set isDeleted flag, preserve refs and relations for restore
        await prisma.entry.updateMany({
            where: { id: { in: ids } },
            data: { isDeleted: true }
        })

        return NextResponse.json({ success: true, count: ids.length })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Bulk delete failed' }, { status: 500 })
    }
}

// app/api/sources/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

// GET /api/sources/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id)
    const source = await prisma.source.findUnique({
        where: { id },
        include: { entries: { select: { id: true, title: true, type: true } } }
    })
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(source)
}

// PUT /api/sources/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id)
    const body = await req.json()
    const { title, sourceType, filepath, pageRange, bibInfo, isDeleted } = body

    const existing = await prisma.source.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.source.update({
        where: { id },
        data: {
            ...(title && { title }),
            ...(sourceType && { sourceType }),
            ...(filepath !== undefined && { filepath }),
            ...(pageRange !== undefined && { pageRange }),
            ...(bibInfo !== undefined && { bibInfo }),
            ...(isDeleted !== undefined && { isDeleted }),
        }
    })

    return NextResponse.json(updated)
}

// DELETE /api/sources/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id)

    await prisma.source.update({
        where: { id },
        data: { isDeleted: true } as any
    })
    return NextResponse.json({ success: true })
}

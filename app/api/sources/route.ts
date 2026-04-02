// app/api/sources/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

// GET /api/sources - List all sources
export async function GET() {
    const sources = await prisma.source.findMany({
        where: { isDeleted: false } as any,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { entries: true } } }
    })
    return NextResponse.json(sources)
}

// POST /api/sources - Create a new source
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { title, sourceType, filepath, pageRange, bibInfo } = body

    if (!title || !sourceType) {
        return NextResponse.json({ error: 'title and sourceType are required' }, { status: 400 })
    }

    const source = await prisma.source.create({
        data: {
            title,
            sourceType,
            filepath: filepath || '',
            pageRange: pageRange || '',
            bibInfo: bibInfo || '',
        }
    })

    return NextResponse.json(source, { status: 201 })
}

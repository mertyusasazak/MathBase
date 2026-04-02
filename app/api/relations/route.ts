// app/api/relations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

// GET /api/relations?entryId=5 — list relations, optionally filtered
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const entryId = searchParams.get('entryId')

    let where = {}
    if (entryId) {
        const id = parseInt(entryId)
        where = {
            OR: [{ fromEntryId: id }, { toEntryId: id }]
        }
    }

    const relations = await prisma.relation.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(relations)
}

// POST /api/relations — create a relation
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { fromEntryId, toEntryId, relationType, confidence, createdBy } = body

    if (!fromEntryId || !toEntryId || !relationType) {
        return NextResponse.json(
            { error: 'fromEntryId, toEntryId, and relationType are required' },
            { status: 400 }
        )
    }

    const validTypes = ['uses', 'example_of', 'generalizes', 'proof_depends_on', 'related_to', 'contrasts_with']
    if (!validTypes.includes(relationType)) {
        return NextResponse.json(
            { error: `relationType must be one of: ${validTypes.join(', ')}` },
            { status: 400 }
        )
    }

    // Check if relation already exists between these two entries
    const existing = await prisma.relation.findFirst({
        where: { fromEntryId, toEntryId }
    })

    if (existing) {
        const updated = await prisma.relation.update({
            where: { id: existing.id },
            data: { 
                relationType,
                confidence: confidence ?? existing.confidence,
                createdBy: createdBy || existing.createdBy
            }
        })
        return NextResponse.json(updated, { status: 200 })
    }

    const relation = await prisma.relation.create({
        data: {
            fromEntryId,
            toEntryId,
            relationType,
            confidence: confidence ?? 1.0,
            createdBy: createdBy || 'user',
        }
    })

    return NextResponse.json(relation, { status: 201 })
}

// DELETE /api/relations?id=5 — delete a relation
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.relation.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
}

// scripts/cleanup-all.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Deep Cleaning Data ---')
  
  // 1. Duplicate Relations
  const relations = await prisma.relation.findMany()
  const seenRels = new Set<string>()
  const relsToDelete: number[] = []

  for (const rel of relations) {
    const key = `${rel.fromEntryId}-${rel.toEntryId}`
    if (seenRels.has(key)) {
      relsToDelete.push(rel.id)
    } else {
      seenRels.add(key)
    }
  }

  if (relsToDelete.length > 0) {
    console.log(`Found ${relsToDelete.length} duplicate relations. Deleting...`)
    await prisma.relation.deleteMany({ where: { id: { in: relsToDelete } } })
  }

  // 2. Duplicate Refs in Entry metadata
  const entries = await prisma.entry.findMany()
  for (const entry of entries) {
    let refs: number[] = []
    try {
      refs = JSON.parse(entry.refs)
    } catch { refs = [] }

    const uniqueRefs = [...new Set(refs)]
    if (uniqueRefs.length !== refs.length) {
      console.log(`Deduplicating refs for entry ${entry.id} ("${entry.title}")`)
      await prisma.entry.update({
        where: { id: entry.id },
        data: { refs: JSON.stringify(uniqueRefs) }
      })
    }
  }

  console.log('Cleanup complete.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())

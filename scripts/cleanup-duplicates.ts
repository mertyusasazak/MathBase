// scripts/cleanup-duplicates.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Cleaning Up Duplicate Relations ---')
  
  const relations = await prisma.relation.findMany()
  const seen = new Set<string>()
  const duplicates: number[] = []

  for (const rel of relations) {
    const key = `${rel.fromEntryId}-${rel.toEntryId}`
    if (seen.has(key)) {
      duplicates.push(rel.id)
    } else {
      seen.add(key)
    }
  }

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate relations. Deleting...`)
    await prisma.relation.deleteMany({
      where: { id: { in: duplicates } }
    })
    console.log('Cleanup complete.')
  } else {
    console.log('No duplicates found.')
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())

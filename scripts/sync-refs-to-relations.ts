import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function sync() {
  console.log('Starting synchronization of refs to Relations table...')
  
  const entries = await prisma.entry.findMany({
    where: { isDeleted: false }
  })
  
  let createdCount = 0
  let skippedCount = 0
  
  for (const entry of entries) {
    let refs: number[] = []
    try {
      refs = JSON.parse(entry.refs)
    } catch (e) {
      console.error(`Failed to parse refs for entry ${entry.id}: ${entry.refs}`)
      continue
    }
    
    if (!Array.isArray(refs)) continue
    
    for (const refId of refs) {
      // Check if target entry exists
      const target = await prisma.entry.findUnique({ where: { id: refId } })
      if (!target) {
        console.warn(`Reference ${refId} in entry ${entry.id} points to non-existent entry. Skipping.`)
        continue
      }
      
      // Check if relation already exists
      const existing = await prisma.relation.findFirst({
        where: { fromEntryId: entry.id, toEntryId: refId }
      })
      
      if (!existing) {
        await prisma.relation.create({
          data: {
            fromEntryId: entry.id,
            toEntryId: refId,
            relationType: 'related_to',
            createdBy: 'sync-script'
          }
        })
        createdCount++
      } else {
        skippedCount++
      }
    }
  }
  
  console.log(`Sync complete!`)
  console.log(`Created: ${createdCount} relations`)
  console.log(`Skipped: ${skippedCount} existing relations`)
}

sync()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

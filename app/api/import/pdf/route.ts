import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma, parseEntry } from '@/lib/core/db'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure uploads directory exists in public for static serving
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const publicPath = join(uploadsDir, file.name)
    await writeFile(publicPath, buffer)

    // Ensure temp directory exists for processing
    const tempDir = join(process.cwd(), 'tmp')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir)
    }

    const tempPath = join(tempDir, `${Date.now()}-${file.name}`)
    await writeFile(tempPath, buffer)

    // Run Python script
    const scriptPath = join(process.cwd(), 'scripts', 'pdf_extract.py')
    
    const results = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [scriptPath, tempPath])
      let data = ''
      let error = ''

      pythonProcess.stdout.on('data', (chunk) => {
        data += chunk.toString()
      })

      pythonProcess.stderr.on('data', (chunk) => {
        error += chunk.toString()
      })

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(error || `Python process exited with code ${code}`))
        } else {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error('Failed to parse Python output as JSON'))
          }
        }
      })
    })

    // Cleanup temp file
    await unlink(tempPath)

    // 2. Automated Relation Suggestion (Confidence-based)
    const existingRaw = await prisma.entry.findMany({
      where: { isDeleted: false },
      select: { id: true, title: true, content: true, tags: true, type: true }
    })
    const existingEntries = existingRaw.map(parseEntry)

    const typeFamilies: Record<string, string> = {
      theorem: 'theory', lemma: 'theory', corollary: 'theory',
      definition: 'foundation', axiom: 'foundation',
      example: 'illustration', remark: 'illustration'
    }

    const EXCLUDED_TITLES = new Set([
      'definition', 'theorem', 'lemma', 'corollary', 'example', 
      'proposition', 'remark', 'note', 'proof', 'axiom'
    ])

    const processedResults = (results as any[]).map(candidate => {
      const suggestions: any[] = []
      const cTags = candidate.tags || []
      const cTitle = (candidate.title || '').toLowerCase()
      
      existingEntries.forEach(entry => {
        let confidence = 0
        const eTitle = (entry.title || '').toLowerCase()
        const eContent = (entry.content || '').toLowerCase()
        
        // 0. Same Title: +0.8 (Very strong)
        const isExcluded = EXCLUDED_TITLES.has(cTitle) || EXCLUDED_TITLES.has(eTitle)
        if (!isExcluded && cTitle === eTitle && cTitle.length > 3) confidence += 0.8

        // 1. Same tag: +0.3
        const hasCommonTag = cTags.some((t: string) => entry.tags.includes(t))
        if (hasCommonTag) confidence += 0.3

        // 2. Title mention: +0.5
        const titleMentioned = !isExcluded && (
          (eContent.includes(cTitle) && cTitle.length > 3) || 
          (candidate.content.toLowerCase().includes(eTitle) && eTitle.length > 3)
        )
        if (titleMentioned) confidence += 0.5

        // 3. Same type family: +0.1
        if (typeFamilies[candidate.type] && typeFamilies[candidate.type] === typeFamilies[entry.type]) {
          confidence += 0.1
        }

        // Threshold: confidence >= 0.5
        if (confidence >= 0.5) {
          suggestions.push({
            toEntryId: entry.id,
            toTitle: entry.title,
            relationType: 'related_to',
            confidence: Math.min(confidence, 1.0)
          })
        }
      })

      console.log(`Candidate "${candidate.title}" suggested relations:`, suggestions.length)
      return {
        ...candidate,
        relations: suggestions
      }
    })

    return NextResponse.json(processedResults)
  } catch (error: any) {
    console.error('Import Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
      definition: 'foundation', axiom: 'foundation', assumption: 'foundation',
      example: 'illustration', remark: 'illustration',
      algorithm: 'procedure', proof: 'procedure',
    }

    // Generic title words that shouldn't count as meaningful matches
    const EXCLUDED_TITLES = new Set([
      'definition', 'theorem', 'lemma', 'corollary', 'example',
      'proposition', 'remark', 'note', 'proof', 'axiom',
      'algorithm', 'assumption', 'observation', 'claim',
    ])

    // Infer the most likely relationType based on the candidate + target type
    function inferRelationType(fromType: string, toType: string): string {
      if (fromType === 'proof') return 'proof_depends_on'
      if (fromType === 'example') return 'example_of'
      if (toType === 'definition') return 'uses'
      if (toType === 'example') return 'example_of'
      if (fromType === 'corollary' && (toType === 'theorem' || toType === 'lemma')) return 'proof_depends_on'
      return 'related_to'
    }

    // Extract a bare number from a title like "Lemma 11" → "11", "3 - Degrees" → "3"
    function extractNumber(title: string): string | null {
      const m = title.match(/\b(\d+)\b/)
      return m ? m[1] : null
    }

    // Build a searchable title index for all candidates (for cross-matching)
    const candidateList = results as any[]
    const candidateTitleIndex = candidateList.map((c: any, i: number) => ({
      title:     c.title || '',
      normTitle: (c.title || '').toLowerCase().trim(),
      number:    extractNumber((c.title || '').toLowerCase()),
      type:      c.type || '',
      tags:      c.tags || [],
      idx:       i
    })).filter(x => x.normTitle.length > 3 && !EXCLUDED_TITLES.has(x.normTitle))

    const processedResults = candidateList.map((candidate: any, selfIdx: number) => {
      const suggestions: any[] = []
      const cTags: string[]   = candidate.tags || []
      const cTitle: string    = (candidate.title || '').toLowerCase().trim()
      const cContent: string  = (candidate.content || '').toLowerCase()
      const cIsExcluded       = EXCLUDED_TITLES.has(cTitle) || cTitle.length <= 3

      // ── Phase 1: Cross-candidate suggestions (same PDF) ──────────────────
      candidateTitleIndex.forEach(({ title, normTitle, number, type: targetType, tags: otherTags, idx }) => {
        if (idx === selfIdx) return
        let score = 0

        // 1a. Exact title mention in content (e.g. content contains "lemma 11")
        if (normTitle.length > 3 && cContent.includes(normTitle)) score += 0.65

        // 1b. Number-aware mention: title = "Lemma 11" → search for "lemma 11", "lem. 11", "lem 11"
        if (number) {
          const typeWord = targetType.substring(0, 3)  // "lem", "the", "def", "alg", "cor"
          if (
            cContent.includes(`${targetType} ${number}`) ||      // "lemma 11"
            cContent.includes(`${typeWord}. ${number}`) ||        // "lem. 11"
            cContent.includes(`${typeWord} ${number}`) ||         // "lem 11"
            cContent.match(new RegExp(`\\b${number}\\b`))         // bare number in context
          ) {
            score += 0.4
          }
        }

        // 1c. Proof → immediately preceding lemma/theorem (very strong signal in academic papers)
        if (candidate.type === 'proof' && idx === selfIdx - 1 &&
            (targetType === 'lemma' || targetType === 'theorem' || targetType === 'corollary')) {
          score += 0.8
        }

        // 1d. Shared tags (same domain = likely related)
        const sharedTags = cTags.filter((t: string) => otherTags.includes(t))
        if (sharedTags.length >= 2) score += 0.25
        else if (sharedTags.length === 1) score += 0.1

        // 1e. Same type family
        const fA = typeFamilies[candidate.type]
        const fB = typeFamilies[targetType]
        if (fA && fA === fB) score += 0.05

        // Lower threshold for same-document matches (they're almost certainly related)
        if (score >= 0.35) {
          if (!suggestions.some(s => s._candidateIdx === idx)) {
            suggestions.push({
              _candidateIdx: idx,
              toEntryId: null,
              toCandidateIdx: idx,
              toTitle: title,
              relationType: inferRelationType(candidate.type, targetType),
              confidence: Math.min(score, 1.0),
              source: 'candidate'
            })
          }
        }
      })

      // ── Phase 2: Library entry suggestions (existing DB entries) ─────────
      existingEntries.forEach((entry: any) => {
        const eTitle      = (entry.title || '').toLowerCase().trim()
        const eContent    = (entry.content || '').toLowerCase()
        const eIsExcluded = EXCLUDED_TITLES.has(eTitle) || eTitle.length <= 3
        let score = 0

        // Candidate content mentions existing entry title
        if (!eIsExcluded && eTitle.length > 3 && cContent.includes(eTitle)) score += 0.6

        // Existing entry content mentions this candidate's title
        if (!cIsExcluded && cTitle.length > 3 && eContent.includes(cTitle)) score += 0.5

        // Shared tags
        const sharedTags = cTags.filter((t: string) => entry.tags.includes(t))
        if (sharedTags.length >= 2) score += 0.3
        else if (sharedTags.length === 1) score += 0.15

        // Same type family
        const fA = typeFamilies[candidate.type]
        const fB = typeFamilies[entry.type]
        if (fA && fB && fA === fB) score += 0.05

        if (score >= 0.5) {
          suggestions.push({
            toEntryId: entry.id,
            toTitle: entry.title,
            relationType: inferRelationType(candidate.type, entry.type),
            confidence: Math.min(score, 1.0),
            source: 'library'
          })
        }
      })

      // Sort by confidence desc, keep top 8
      const topSuggestions = suggestions
        .map(({ _candidateIdx, ...rest }) => rest)
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .slice(0, 8)

      return {
        ...candidate,
        relations: topSuggestions
      }
    })

    return NextResponse.json(processedResults)

  } catch (error: any) {
    console.error('Import Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

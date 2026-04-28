import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    // Cleanup temp file only
    await unlink(tempPath)

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Import Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

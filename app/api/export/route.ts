// app/api/export/route.ts
// LaTeX, JSON ve PDF export (Server-Side Puppeteer + MathJax)

import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'
import puppeteer from 'puppeteer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'
  const ids = searchParams.get('ids') // "1,2,3" veya boş (tümü)
  const accentColor = searchParams.get('accent') || '#000000'
  const theme = searchParams.get('theme') || 'dark'

  const where = ids
    ? { id: { in: ids.split(',').map(Number) } }
    : {}

  const raw = await prisma.entry.findMany({
    where,
    orderBy: { id: 'asc' },
    select: {
      id: true, type: true, title: true, content: true,
      tags: true, refs: true, createdAt: true, updatedAt: true,
      symbolKeywords: true, sourceId: true, pageRange: true
    }
  })

  const entries = raw.map(parseEntry)

  // 1. Resolve relations
  const entryIds = entries.map(e => e.id)
  const allRelations = await prisma.relation.findMany({
    where: {
      OR: [
        { fromEntryId: { in: entryIds } },
        { toEntryId: { in: entryIds } }
      ]
    }
  })

  // 2. Resolve titles for references and relations
  const allRefIds = entries.flatMap(e => e.refs)
  const relationIds = allRelations.flatMap(r => [r.fromEntryId, r.toEntryId])
  const uniqueInvolvedIds = Array.from(new Set([...allRefIds, ...relationIds]))
  
  const involvedEntries = await prisma.entry.findMany({
    where: { 
      id: { in: uniqueInvolvedIds },
      isDeleted: false 
    },
    select: { id: true, title: true }
  })
  const titleMap = Object.fromEntries(involvedEntries.map(r => [r.id, r.title]))

  // 3. Map relations per entry
  const relationsMap: Record<number, { outgoing: any[], incoming: any[] }> = {}
  entries.forEach(e => {
    relationsMap[e.id] = {
      outgoing: allRelations.filter(r => r.fromEntryId === e.id),
      incoming: allRelations.filter(r => r.toEntryId === e.id)
    }
  })

  // 4. Resolve sources
  const allSourceIds = Array.from(new Set(entries.map(e => e.sourceId).filter(Boolean))) as number[]
  const sources = await prisma.source.findMany({
    where: { id: { in: allSourceIds } },
    select: { id: true, title: true }
  })
  const sourceMap = Object.fromEntries(sources.map(s => [s.id, s.title]))

  // 2. PDF Export
  if (format === 'pdf') {
    try {
      const pdfBuffer = await generatePDF(entries, titleMap, sourceMap, relationsMap, accentColor, theme)
      const dateStr = new Date().toISOString().slice(0, 10)
      
      let filename = `mathbase-export-${dateStr}.pdf`
      if (ids && entries.length === 1) {
        const safeTitle = entries[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        filename = `${safeTitle}-${dateStr}.pdf`
      }

      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } catch (error) {
      console.error("PDF Generate Error:", error)
      return NextResponse.json({ error: 'Failed to generate PDF on server' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown format' }, { status: 400 })
}

function processMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

async function generatePDF(
  entries: any[], 
  titleMap: Record<number, string>, 
  sourceMap: Record<number, string>, 
  relationsMap: Record<number, { outgoing: any[], incoming: any[] }>,
  accentColor: string, 
  theme: string
): Promise<Uint8Array> {
  const isDark = theme === 'dark';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // MathJax entegreli HTML şablonu
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <script>
        MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
          },
          chtml: { displayAlign: 'left' }
        };
      </script>
      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
      <style>
        @page { margin: 0; }
        
        html, body {
          background-color: ${isDark ? '#0d0e12' : '#ffffff'} !important;
          margin: 0;
          padding: 5mm;
          min-height: 100%;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          color: ${isDark ? '#e2e8f0' : '#1a1a1a'}; 
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.4;
        }

        .header { margin-bottom: 15px; border-bottom: 2px solid ${isDark ? '#1e293b' : '#eee'}; padding-bottom: 5px; }
        .entry { margin-bottom: 25px; page-break-inside: avoid; width: 100%; }
        
        .type-badge { 
          font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px; border: 1px solid; 
          text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 8px;
        }
        
        .title { font-size: 24px; margin: 0 0 8px; font-weight: 700; color: ${accentColor}; }
        .content { font-size: 15px; margin-bottom: 12px; text-align: justify; color: ${isDark ? '#cbd5e1' : '#1a1a1a'}; }
        
        .metadata-section { margin-top: 10px; padding-top: 8px; border-top: 1px solid ${isDark ? '#1e293b' : '#f0f0f0'}; }
        .meta-label { font-size: 10px; font-weight: bold; color: ${isDark ? '#64748b' : '#888'}; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
        
        .tag-container { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag { display: inline-block; padding: 2px 8px; background: ${isDark ? '#1e293b' : '#f5f5f5'}; border: 1px solid ${isDark ? '#334155' : '#e0e0e0'}; border-radius: 12px; font-size: 11px; color: ${isDark ? '#94a3b8' : '#555'}; }
        .symbol-container { display: flex; flex-wrap: wrap; gap: 12px; }
        .relation { display: block; font-size: 14px; color: ${accentColor}; margin-bottom: 4px; text-decoration: none; opacity: 0.85; }
        .source-box { font-style: italic; font-size: 13px; color: ${isDark ? '#64748b' : '#666'}; margin-top: 8px; }

        /* Type Colors */
        .def-color { color: ${isDark ? '#90cdf4' : '#2c5282'}; border-color: ${isDark ? '#2c5282' : '#a3bffa'}; background: ${isDark ? '#1a365d' : '#ebf4ff'}; }
        .the-color { color: ${isDark ? '#feb2b2' : '#822727'}; border-color: ${isDark ? '#822727' : '#feb2b2'}; background: ${isDark ? '#63171b' : '#fff5f5'}; }
        .lem-color { color: ${isDark ? '#9ae6b4' : '#22543d'}; border-color: ${isDark ? '#22543d' : '#9ae6b4'}; background: ${isDark ? '#1c4532' : '#f0fff4'}; }
        .cor-color { color: ${isDark ? '#fbb6ce' : '#702459'}; border-color: ${isDark ? '#702459' : '#fbb6ce'}; background: ${isDark ? '#521b41' : '#fff5f7'}; }
        .exa-color { color: ${isDark ? '#fbd38d' : '#744210'}; border-color: ${isDark ? '#744210' : '#fbd38d'}; background: ${isDark ? '#5f370e' : '#fffaf0'}; }
        .rem-color { color: ${isDark ? '#d6bcfa' : '#44337a'}; border-color: ${isDark ? '#44337a' : '#d6bcfa'}; background: ${isDark ? '#322659' : '#faf5ff'}; }
        .alg-color { color: ${isDark ? '#81e6d9' : '#134e4a'}; border-color: ${isDark ? '#134e4a' : '#81e6d9'}; background: ${isDark ? '#0f3d3e' : '#e6fffa'}; }
        .pro-color { color: ${isDark ? '#cbd5e1' : '#334155'}; border-color: ${isDark ? '#475569' : '#cbd5e1'}; background: ${isDark ? '#1e293b' : '#f1f5f9'}; }
        .axi-color { color: ${isDark ? '#ffaf66' : '#9c4221'}; border-color: ${isDark ? '#5c2411' : '#ffcd9b'}; background: ${isDark ? '#3d160a' : '#fffaf5'}; }
        .ass-color { color: ${isDark ? '#a7f3d0' : '#065f46'}; border-color: ${isDark ? '#064e3b' : '#a7f3d0'}; background: ${isDark ? '#022c22' : '#ecfdf5'}; }
      </style>
    </head>
    <body>
              <div class="header">
                <h1 style="font-size: 42px; margin:0; font-family: 'EB Garamond', serif; color: ${accentColor};">∂ MathBase</h1>
                <p style="color: ${isDark ? '#64748b' : '#666'}; margin: 5px 0; font-style: italic;">Mathematical Knowledge Repository</p>
                <p style="color: ${isDark ? '#475569' : '#999'}; font-size: 11px;">Generated: ${dateStr}</p>
              </div>
  `;

  entries.forEach((entry) => {
    const typeClass = entry.type.substring(0, 3).toLowerCase() + '-color';
    const processedContent = processMarkdown(entry.content);
    
    // Comprehensive Metadata for perfect re-import
    const metadata = {
      content: entry.content,
      type: entry.type,
      tags: entry.tags,
      relations: [
        ...entry.refs.filter((rId: number) => titleMap[rId]).map((rId: number) => ({ toEntryId: rId, toTitle: titleMap[rId], relationType: 'related_to' })),
        ...relationsMap[entry.id].outgoing.map(r => ({ toEntryId: r.toEntryId, toTitle: titleMap[r.toEntryId] || 'Unknown', relationType: r.relationType }))
      ]
    };
    // Base64 encoding to prevent PDF text mangling
    const encodedData = Buffer.from(JSON.stringify(metadata)).toString('base64');
    // Using tiny font and background-matching color to ensure it's in the text layer but invisible
    const hiddenSource = `<div style="font-size:1px; line-height:0; color:${isDark ? '#0d0e12' : '#ffffff'}; opacity:0.01; height:1px; overflow:hidden;">[MB_B64]${encodedData}[MB_END]</div>`;
    
    const sourceTitle = entry.sourceId ? sourceMap[entry.sourceId] : null;

    htmlContent += `
      <div class="entry">
        <span class="type-badge ${typeClass}">${entry.type}</span>
        <h2 class="title">${entry.title}</h2>
        ${hiddenSource}
        <div class="content">${processedContent}</div>
        
        <div class="metadata-section">
          ${entry.tags.length > 0 ? `
            <div style="margin-bottom: 12px;">
              <div class="meta-label">Tags</div>
              <div class="tag-container">${entry.tags.map((t: string) => `<span class="tag">#${t}</span>`).join('')}</div>
            </div>
          ` : ''}

          ${entry.symbolKeywords && entry.symbolKeywords.length > 0 ? `
            <div style="margin-bottom: 12px;">
              <div class="meta-label">Keywords</div>
              <div class="symbol-container">${entry.symbolKeywords.map((s: string) => `<span style="font-family: 'Courier New', monospace; font-weight: bold; color: ${accentColor}; font-size: 14px;">${s}</span>`).join('')}</div>
            </div>
          ` : ''}

          ${entry.refs.length > 0 || (relationsMap[entry.id] && (relationsMap[entry.id].outgoing.length > 0 || relationsMap[entry.id].incoming.length > 0)) ? `
            <div style="margin-bottom: 12px;">
              <div class="meta-label">Relationships</div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${entry.refs
                  .filter((rId: number) => titleMap[rId])
                  .map((rId: number) => `<div class="relation">• ${titleMap[rId]}</div>`)
                  .join('')}
                ${relationsMap[entry.id].outgoing.map(r => `
                  <div class="relation">• <span style="font-weight: bold;">${r.relationType.replace('_', ' ')}:</span> ${titleMap[r.toEntryId] || 'Unknown'}</div>
                `).join('')}
                ${relationsMap[entry.id].incoming
                  .filter(r => titleMap[r.fromEntryId]) // Only show if the source entry exists and isn't deleted
                  .map(r => `
                  <div class="relation">• <span style="font-weight: bold;">referenced by (${r.relationType.replace('_', ' ')}):</span> ${titleMap[r.fromEntryId] || 'Unknown'}</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${sourceTitle ? `
            <div class="source-box">
              Source: ${sourceTitle}${entry.pageRange ? `, pp. ${entry.pageRange}` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}

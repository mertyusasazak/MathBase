// app/api/export/route.ts
// LaTeX, JSON ve PDF export (Server-Side Puppeteer + MathJax)

import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseEntry } from '@/lib/core/db'
import puppeteer from 'puppeteer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'
  const ids = searchParams.get('ids') // "1,2,3" veya boş (tümü)

  const where = ids
    ? { id: { in: ids.split(',').map(Number) } }
    : {}

  const raw = await prisma.entry.findMany({
    where,
    orderBy: { id: 'asc' },
    select: {
      id: true, type: true, title: true, content: true,
      tags: true, refs: true, createdAt: true, updatedAt: true
    }
  })

  const entries = raw.map(parseEntry)

  // JSON export removed per user request

  // 2. LaTeX Export
  if (format === 'latex') {
    const latex = generateLaTeX(entries)
    return new NextResponse(latex, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="mathbase-export.tex"'
      }
    })
  }

  // 3. PDF Export
  if (format === 'pdf') {
    try {
      const pdfBuffer = await generatePDF(entries)
      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="mathbase-export-${new Date().toISOString().slice(0, 10)}.pdf"`
        }
      })
    } catch (error) {
      console.error("PDF Generate Error:", error)
      return NextResponse.json({ error: 'Failed to generate PDF on server' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown format' }, { status: 400 })
}

function generateLaTeX(entries: any[]): string {
  const typeEnvMap: Record<string, string> = {
    definition: 'definition',
    theorem: 'theorem',
    lemma: 'lemma',
    corollary: 'corollary',
    example: 'example',
    remark: 'remark',
  }

  const blocks = entries.map(e => {
    const env = typeEnvMap[e.type] || 'remark'
    const content = e.content
      .replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}')
      .replace(/\*(.*?)\*/g, '\\textit{$1}')
      .replace(/\n\n/g, '\n\n')

    return [
      `\\begin{${env}}[${e.title}]`,
      `\\label{entry:${e.id}}`,
      content,
      e.refs.length > 0
        ? `\n% References: ${e.refs.map((r: number) => `\\ref{entry:${r}}`).join(', ')}`
        : '',
      `\\end{${env}}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `% MathBase Export
% Generated: ${new Date().toISOString()}

\\documentclass{amsart}
\\usepackage{amsmath, amsthm, amssymb}

% Theorem environments
\\newtheorem{theorem}{Theorem}
\\newtheorem{lemma}[theorem]{Lemma}
\\newtheorem{corollary}[theorem]{Corollary}
\\theoremstyle{definition}
\\newtheorem{definition}[theorem]{Definition}
\\newtheorem{example}[theorem]{Example}
\\theoremstyle{remark}
\\newtheorem{remark}[theorem]{Remark}

\\begin{document}

${blocks}

\\end{document}
`
}

async function generatePDF(entries: any[]): Promise<Uint8Array> {
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
          svg: { fontCache: 'global' }
        };
      </script>
      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
      <style>
        @page { margin: 0; }
        
        html, body {
          background-color: #121212 !important;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          color: #ffffff; 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        table { width: 100%; border-collapse: collapse; }
        thead td, tfoot td { height: 10mm; padding: 0; } 
        .content-cell { padding: 0 10mm; } 
        tr { page-break-inside: avoid; }
        
        .header { margin-bottom: 40px; border-bottom: 1px solid #333; padding-bottom: 20px; }
        .entry { margin-bottom: 40px; }
        .badge { font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 4px; border: 1px solid; letter-spacing: 1px; }
        .title { font-size: 24px; margin: 15px 0; font-family: 'Times New Roman', serif; }
        .content { font-size: 14px; line-height: 1.6; color: #d0d0d0; font-family: 'Times New Roman', serif; }
        
        /* Type Colors */
        .def-color { color: rgb(107, 143, 204); border-color: rgb(107, 143, 204); }
        .the-color { color: rgb(201, 107, 107); border-color: rgb(201, 107, 107); }
        .lem-color { color: rgb(143, 204, 143); border-color: rgb(143, 204, 143); }
        .cor-color { color: rgb(204, 107, 168); border-color: rgb(204, 107, 168); }
        .exa-color { color: rgb(204, 159, 107); border-color: rgb(204, 159, 107); }
        .rem-color { color: rgb(160, 107, 204); border-color: rgb(160, 107, 204); }
      </style>
    </head>
    <body>
      <table>
        <thead><tr><td></td></tr></thead>
        
        <tfoot><tr><td></td></tr></tfoot>
        
        <tbody>
          <tr>
            <td class="content-cell">
              <div class="header">
                <h1 style="font-size: 36px; margin:0;">∂ MathBase</h1>
                <p style="color: #a0a0a0; margin: 5px 0;">Mathematical Knowledge Repository</p>
                <p style="color: #666; font-size: 12px;">Exported: ${dateStr}</p>
              </div>
            </td>
          </tr>
  `;

  entries.forEach((entry) => {
    const typeClass = entry.type.substring(0, 3).toLowerCase() + '-color';
    htmlContent += `
          <tr>
            <td class="content-cell">
              <div class="entry">
                <span class="badge ${typeClass}">${entry.type.toUpperCase()}</span>
                <h2 class="title">${entry.title}</h2>
                <div class="content">${entry.content}</div>
              </div>
            </td>
          </tr>
    `;
  });

  htmlContent += `
        </tbody>
      </table>
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
      margin: { top: '0', bottom: '0', left: '0', right: '0' } // KESİNLİKLE SIFIR KALIYOR
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}

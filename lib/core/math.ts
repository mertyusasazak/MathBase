import 'katex/dist/katex.min.css'
import katex from 'katex'

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
}
const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
}

function toSup(n: string): string { return n.split('').map(d => SUP[d] || d).join('') }
function toSub(n: string): string { return n.split('').map(d => SUB[d] || d).join('') }

function katexRender(math: string, display: boolean): string {
  try {
    return katex.renderToString(math, { displayMode: display, throwOnError: false, output: 'html', trust: true })
  } catch {
    return math
  }
}

/**
 * Renders mathematical titles with KaTeX for $ delimiters and Unicode for simple exponents.
 */
export function renderTitle(title: string): string {
  if (!title) return ''
  return title
    .replace(/\$([^$]+)\$/g, (_, m) => katexRender(m, false))
    .replace(/\^{(\d+)}/g, (_, n) => toSup(n))
    .replace(/\^(\d)/g, (_, n) => toSup(n))
    .replace(/_{(\d+)}/g, (_, n) => toSub(n))
    .replace(/_(\d)/g, (_, n) => toSub(n))
}

/**
 * Renders full mathematical content with KaTeX and basic Markdown support.
 */
export function renderContent(content: string): string {
  if (!content) return ''
  return content
    // Markdown headers
    .replace(/^### (.*)/gm, '<h3 style="font-size:1rem;margin:1em 0 0.5em;color:#e8e6df">$1</h3>')
    .replace(/^## (.*)/gm, '<h2 style="font-size:1.1rem;margin:1em 0 0.5em;color:#e8e6df">$1</h2>')
    .replace(/^# (.*)/gm, '<h1 style="font-size:1.2rem;margin:1em 0 0.5em;color:#e8e6df">$1</h1>')
    // Markdown lists
    .replace(/^\d+\. (.*)/gm, '<div style="margin:4px 0;padding-left:16px">$1</div>')
    .replace(/^[-*] (.*)/gm, '<div style="margin:4px 0;padding-left:16px">• $1</div>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border-color:#2a2a33;margin:1em 0"/>')
    // Bold/italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // KaTeX Block & Inline
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => katexRender(m.trim(), true))
    .replace(/\$((?:[^$]|\\.)*?)\$/g, (_, m) => katexRender(m, false))
    // Paragraphs
    .split('\n\n')
    .map(p => p.trim() ? `<p style="margin-bottom:1em">${p}</p>` : '')
    .join('')
}


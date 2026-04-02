import { computeSimpleEmbedding, cosineSimilarity } from '@/lib/services/ai'

/* ──── DUPLICATES ──── */
export interface DuplicateCandidate {
  id: number
  title: string
  type: string
  score: number
}

const SIMILARITY_THRESHOLD = 0.6

export function findDuplicates(
  title: string,
  content: string,
  allEntries: { id: number; title: string; type: string; content: string; embedding?: string }[],
  excludeId?: number
): DuplicateCandidate[] {
  const queryText = title + ' ' + content
  const queryVec = computeSimpleEmbedding(queryText)
  const scored: DuplicateCandidate[] = []

  for (const entry of allEntries) {
    if (excludeId && entry.id === excludeId) continue

    let entryVec: number[]
    if (entry.embedding && entry.embedding !== '[]') {
      entryVec = JSON.parse(entry.embedding)
    } else {
      entryVec = computeSimpleEmbedding(entry.title + ' ' + entry.content)
    }

    const score = cosineSimilarity(queryVec, entryVec)
    if (score >= SIMILARITY_THRESHOLD) {
      scored.push({
        id: entry.id,
        title: entry.title,
        type: entry.type,
        score: Math.round(score * 100) / 100,
      })
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 3)
}

/* ──── KEYWORDS ──── */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this',
  'these', 'those', 'it', 'its', 'we', 'they', 'them', 'their', 'he',
  'she', 'him', 'her', 'i', 'me', 'my', 'you', 'your', 'what', 'which',
  'who', 'whom', 'let', 'say', 'also', 'given', 'show', 'note', 'see',
  'called', 'denoted', 'defined', 'follows', 'following', 'consider',
  'since', 'thus', 'hence', 'therefore', 'any', 'about', 'up', 'down',
])

const MATH_SYMBOL_PATTERNS = [
  /\\mathbb\{([A-Z])\}/g,
  /\\mathcal\{([A-Z])\}/g,
  /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/gi,
  /\\(infty|nabla|partial|forall|exists|nexists|emptyset|varnothing)/gi,
  /\\(sum|prod|int|oint|bigcup|bigcap|bigoplus|bigotimes)/gi,
  /\\(lim|sup|inf|max|min|arg|det|dim|ker|rank|trace|span|deg)/gi,
]

export function extractKeywords(text: string): string[] {
  const cleaned = text
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*?\$/g, ' ')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}\\[\]()]/g, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .toLowerCase()

  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

  const symbols: string[] = []
  MATH_SYMBOL_PATTERNS.forEach(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match
    while ((match = regex.exec(text)) !== null) {
      symbols.push(match[1] || match[0].replace('\\', ''))
    }
  })

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 15)

  const all = [...new Set([...sorted, ...symbols.map(s => s.toLowerCase())])]
  return all.slice(0, 20)
}

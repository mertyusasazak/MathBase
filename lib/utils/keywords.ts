// lib/keywords.ts
// TF-IDF-like keyword extraction for math entries

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

// Math-specific symbols to detect via regex
const MATH_SYMBOL_PATTERNS = [
    /\\mathbb\{([A-Z])\}/g,     // ℝ, ℂ, ℤ, etc.
    /\\mathcal\{([A-Z])\}/g,    // calligraphic letters
    /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/gi,
    /\\(infty|nabla|partial|forall|exists|nexists|emptyset|varnothing)/gi,
    /\\(sum|prod|int|oint|bigcup|bigcap|bigoplus|bigotimes)/gi,
    /\\(lim|sup|inf|max|min|arg|det|dim|ker|rank|trace|span|deg)/gi,
]

export function extractKeywords(text: string): string[] {
    // 1. Strip LaTeX commands but keep meaningful words
    const cleaned = text
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')    // remove display math
        .replace(/\$[^$]*?\$/g, ' ')           // remove inline math
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // keep content of LaTeX cmds
        .replace(/\\[a-zA-Z]+/g, ' ')          // remove remaining LaTeX cmds
        .replace(/[{}\\[\]()]/g, ' ')          // remove brackets
        .replace(/[^a-zA-Z\s-]/g, ' ')         // keep letters and hyphens
        .toLowerCase()

    // 2. Tokenize and count frequency
    const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
    const freq: Record<string, number> = {}
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

    // 3. Extract math symbols from original text
    const symbols: string[] = []
    MATH_SYMBOL_PATTERNS.forEach(pattern => {
        const regex = new RegExp(pattern.source, pattern.flags)
        let match
        while ((match = regex.exec(text)) !== null) {
            symbols.push(match[1] || match[0].replace('\\', ''))
        }
    })

    // 4. Combine: top frequency words + math-specific terms
    const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word)
        .slice(0, 15)

    // Merge and deduplicate
    const all = [...new Set([...sorted, ...symbols.map(s => s.toLowerCase())])]
    return all.slice(0, 20)
}

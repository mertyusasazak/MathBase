"""
MathBase PDF Extractor - v3.0
Extracts ONLY entries whose type matches the MathBase library:
  definition, theorem, lemma, corollary, example, remark,
  algorithm, proof, axiom, assumption

Rules:
  - Empty content entries are skipped
  - References / Bibliography section stops extraction
  - Unicode math symbols → LaTeX
  - Garbled UTF-8 sequences are recovered
"""

import fitz  # PyMuPDF
import json
import re
import sys
import os
import base64

# ── Library-defined entry types (must match constants.ts) ─────────────────────
# These are the ONLY types we extract from PDFs.
LIBRARY_TYPES = {
    'definition', 'theorem', 'lemma', 'corollary', 'example', 'remark',
    'algorithm', 'proof', 'axiom', 'assumption',
}

# How to map PDF keyword → library type
TYPE_MAPPING = {
    # Direct matches (already in library)
    'definition': 'definition',
    'theorem':    'theorem',
    'lemma':      'lemma',
    'corollary':  'corollary',
    'example':    'example',
    'remark':     'remark',
    'algorithm':  'algorithm',
    'proof':      'proof',
    'axiom':      'axiom',
    'assumption': 'assumption',
    # Aliases → library type
    'proposition':  'theorem',
    'conjecture':   'theorem',
    'claim':        'theorem',
    'fact':         'theorem',
    'criterion':    'theorem',
    'note':         'remark',
    'observation':  'remark',
    'notation':     'remark',
    'problem':      'example',
    'exercise':     'example',
    'question':     'example',
    'condition':    'assumption',
}

# Keywords we match in PDF headers (must be a key in TYPE_MAPPING)
PDF_KEYWORDS = sorted(TYPE_MAPPING.keys(), key=len, reverse=True)  # longest first for safety

# ── Domain auto-tagging ────────────────────────────────────────────────────────
DOMAINS = {
    'analysis': ['limit', 'continuity', 'derivative', 'integral', 'measure',
                 'norm', 'convergence', 'sequence', 'series', 'differentiable',
                 'continuous', 'bounded', 'cauchy', 'function'],
    'topology': ['open set', 'closed set', 'compact', 'connected', 'homeomorphism',
                 'metric space', 'neighborhood', 'hausdorff', 'manifold', 'homotopy'],
    'algebra':  ['group', 'ring', 'field', 'ideal', 'module', 'homomorphism',
                 'isomorphism', 'vector space', 'linear', 'subgroup', 'kernel',
                 'quotient', 'lattice'],
    'graph_theory': ['graph', 'vertex', 'edge', 'spanning', 'cycle', 'path',
                     'subgraph', 'bipartite', 'planar', 'matching', 'clique',
                     'cut', 'flow', 'tree', 'connected'],
    'combinatorics': ['combination', 'permutation', 'partition', 'binomial',
                      'generating function', 'pigeonhole', 'ramsey', 'coloring'],
    'algorithms': ['algorithm', 'complexity', 'approximation', 'polynomial',
                   'np-hard', 'optimization', 'primal', 'dual', 'lp',
                   'linear programming', 'greedy', 'dynamic programming'],
    'logic': ['proposition', 'predicate', 'axiom', 'inference', 'quantifier',
              'boolean', 'satisfiability', 'proof', 'induction'],
    'geometry': ['manifold', 'curvature', 'geodesic', 'bundle', 'surface',
                 'polytope', 'convex', 'simplex', 'affine'],
    'probability': ['probability', 'random', 'expectation', 'variance',
                    'distribution', 'markov', 'stochastic', 'event'],
    'number_theory': ['prime', 'divisor', 'congruence', 'modular', 'gcd',
                      'euler', 'fermat', 'diophantine'],
}

# ── Unicode cleaning ───────────────────────────────────────────────────────────
LIGATURES = {
    '\uf001': 'fi', '\uf002': 'fl', '\uf003': 'ff',
    '\uf004': 'ffi', '\uf005': 'ffl',
    '\ufb00': 'ff', '\ufb01': 'fi', '\ufb02': 'fl',
    '\ufb03': 'ffi', '\ufb04': 'ffl',
    '\u2212': '-',   # minus sign
    '\u2013': '-',   # en dash
    '\u2014': '-',   # em dash
    '\u2019': "'",   # right single quote
    '\u2018': "'",   # left single quote
    '\u201c': '"',   # left double quote
    '\u201d': '"',   # right double quote
    '\u2032': "'",   # prime ′
}

MATH_SYMBOL_MAP = {
    '∑': r'\sum', '∏': r'\prod', '∫': r'\int', '∂': r'\partial',
    '∀': r'\forall', '∃': r'\exists', '∈': r'\in', '∉': r'\notin',
    '⊂': r'\subset', '⊆': r'\subseteq', '⊃': r'\supset', '⊇': r'\supseteq',
    '∪': r'\cup', '∩': r'\cap', '∅': r'\emptyset',
    '→': r'\to', '←': r'\leftarrow', '↔': r'\leftrightarrow',
    '⇒': r'\implies', '⇐': r'\Leftarrow', '⇔': r'\iff',
    '≈': r'\approx', '≠': r'\neq', '≤': r'\le', '≥': r'\ge',
    '≡': r'\equiv', '∼': r'\sim', '∝': r'\propto',
    '⊊': r'\subsetneq', '⊋': r'\supsetneq',
    'α': r'\alpha', 'β': r'\beta', 'γ': r'\gamma', 'δ': r'\delta',
    'ε': r'\varepsilon', 'ζ': r'\zeta', 'η': r'\eta', 'θ': r'\theta',
    'ι': r'\iota', 'κ': r'\kappa', 'λ': r'\lambda', 'μ': r'\mu',
    'ν': r'\nu', 'ξ': r'\xi', 'π': r'\pi', 'ρ': r'\rho',
    'σ': r'\sigma', 'τ': r'\tau', 'υ': r'\upsilon', 'φ': r'\phi',
    'χ': r'\chi', 'ψ': r'\psi', 'ω': r'\omega',
    'Γ': r'\Gamma', 'Δ': r'\Delta', 'Θ': r'\Theta', 'Λ': r'\Lambda',
    'Ξ': r'\Xi', 'Π': r'\Pi', 'Σ': r'\Sigma', 'Υ': r'\Upsilon',
    'Φ': r'\Phi', 'Ψ': r'\Psi', 'Ω': r'\Omega',
    '∇': r'\nabla', '⊕': r'\oplus', '⊗': r'\otimes',
    '·': r'\cdot', '×': r'\times', '÷': r'\div',
    '⌈': r'\lceil', '⌉': r'\rceil', '⌊': r'\lfloor', '⌋': r'\rfloor',
    '∞': r'\infty', '√': r'\sqrt', '±': r'\pm', '∓': r'\mp',
    '¬': r'\neg', '∧': r'\land', '∨': r'\lor',
    '⊢': r'\vdash', '⊨': r'\models', '⊥': r'\perp', '∥': r'\parallel',
    '⋅': r'\cdot', '≺': r'\prec', '≻': r'\succ',
    '⋆': r'\star',
}

# Arrow prefixes used by LIPIcs, LNCS and similar academic styles
ARROW_PREFIXES = ('▶', '►', '▸', '◆', '•', '▷')

# Stop permanently when hitting these section titles
HARD_STOP_RE = re.compile(
    r'^\s*(References?|Bibliography|Acknowledgements?|Appendix)\s*$',
    re.IGNORECASE
)

# Skip lone page numbers / short author-header lines
PAGE_ARTIFACT_RE = re.compile(r'^\d{1,4}$|^\s*$')

# ── Header regex ───────────────────────────────────────────────────────────────
# Matches:  [▶] Keyword [Number] [(Title)] [./:] [rest...]
_kw_group = '|'.join(re.escape(k) for k in PDF_KEYWORDS)
HEADER_RE = re.compile(
    r'^[▶►▸◆•▷]?\s*'
    rf'(?P<kw>{_kw_group})'
    r'\s*'
    r'(?P<num>\d+(?:\.\d+)*)?\s*'       # optional number
    r'(?:\((?P<ptitle>[^)]{0,100})\))?\s*'  # optional (Paren Title)
    r'[.:\s]?\s*'
    r'(?P<rest>.*)$',
    re.IGNORECASE
)


# ── Text cleaning ──────────────────────────────────────────────────────────────

def _re_encode_garbled(text: str) -> str:
    """
    Recover chars where UTF-8 bytes were decoded char-by-char as Latin-1.
    e.g.  Ã§  →  ç   (0xC3 0xA7 decoded as two Latin-1 chars)
    """
    result = []
    i = 0
    while i < len(text):
        o = ord(text[i])
        # 3-byte UTF-8 leader (0xE0-0xEF) + two continuation bytes
        if 0xE0 <= o <= 0xEF and i + 2 < len(text):
            o2, o3 = ord(text[i+1]), ord(text[i+2])
            if 0x80 <= o2 <= 0xBF and 0x80 <= o3 <= 0xBF:
                try:
                    result.append(bytes([o, o2, o3]).decode('utf-8'))
                    i += 3
                    continue
                except (UnicodeDecodeError, ValueError):
                    pass
        # 2-byte UTF-8 leader (0xC2-0xDF) + one continuation byte
        if 0xC2 <= o <= 0xDF and i + 1 < len(text):
            o2 = ord(text[i+1])
            if 0x80 <= o2 <= 0xBF:
                try:
                    result.append(bytes([o, o2]).decode('utf-8'))
                    i += 2
                    continue
                except (UnicodeDecodeError, ValueError):
                    pass
        result.append(text[i])
        i += 1
    return ''.join(result)


def clean_text(text: str) -> str:
    """Full cleaning pipeline: garbled recovery → ligatures → math symbols."""
    text = _re_encode_garbled(text)
    for bad, good in LIGATURES.items():
        text = text.replace(bad, good)
    text = text.replace('\ufffd', '?')
    for sym, latex in MATH_SYMBOL_MAP.items():
        text = text.replace(sym, f'${latex}$')
    # combining long solidus ̸ (U+0338) after = → \neq
    text = re.sub(r'=\u0338', r'\\neq ', text)
    text = re.sub(r'(\S)\u0338', r'\1/', text)
    # remove remaining undecodable high-range Latin-1 sequences
    text = re.sub(r'[\xc0-\xff][\x80-\xff]{1,2}', '', text)
    # strip non-printable control chars
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text


def normalize_whitespace(text: str) -> str:
    lines = text.split('\n')
    lines = [' '.join(l.split()) for l in lines]
    # collapse 3+ blank lines to 1
    result, blanks = [], 0
    for l in lines:
        if l:
            result.append(l)
            blanks = 0
        else:
            blanks += 1
            if blanks <= 1:
                result.append('')
    return '\n'.join(result).strip()


# ── Auto-tagging & keywords ────────────────────────────────────────────────────

def detect_tags(text: str, title: str = '') -> list:
    combined = (text + ' ' + title).lower()
    return [d for d, kws in DOMAINS.items() if any(kw in combined for kw in kws)]


def extract_keywords(text: str) -> list:
    latex = re.findall(r'\\[a-zA-Z]+', text)
    caps  = re.findall(r'\b[A-Z][a-z]{3,}\b', text)
    phrases = re.findall(r'\b(?:[A-Z][a-z]+\s+){1,3}[A-Z][a-z]+\b', text)
    return list(dict.fromkeys(phrases + caps + latex))[:10]


# ── Block extraction ───────────────────────────────────────────────────────────

def get_lines(page) -> list:
    """Return a list of line strings from a page, preserving multi-span lines."""
    lines = []
    raw = page.get_text('dict', flags=fitz.TEXT_PRESERVE_WHITESPACE)
    for block in raw.get('blocks', []):
        if block.get('type') != 0:
            continue
        for line in block.get('lines', []):
            text = ''.join(s.get('text', '') for s in line.get('spans', []))
            text = text.strip()
            if text:
                lines.append(text)
    return lines


# ── Main extraction ────────────────────────────────────────────────────────────

def try_parse_header(line: str):
    """
    Returns (library_type, number, paren_title, rest_of_line)
    or None if line is not an entry header.
    """
    stripped = line.strip()
    for pfx in ARROW_PREFIXES:
        stripped = stripped.lstrip(pfx).lstrip()

    m = HEADER_RE.match(stripped)
    if not m:
        return None

    raw_kw = m.group('kw').lower()
    lib_type = TYPE_MAPPING.get(raw_kw)
    if lib_type not in LIBRARY_TYPES:
        return None          # keyword not in our library → ignore

    return (
        lib_type,
        m.group('num') or '',
        (m.group('ptitle') or '').strip(),
        (m.group('rest') or '').strip(),
    )


def build_title(lib_type: str, number: str, paren_title: str) -> str:
    """
    Priority:
      1. Paren title  →  use it directly  (e.g. "2-ECSS and 2-VCSS")
      2. Number only  →  "Type Number"    (e.g. "Lemma 11", "Remark 8")
      3. Nothing      →  ""  (caller will fall back to type.capitalize())
    """
    if paren_title:
        # Optionally prefix the number for disambiguation: "11 - Strong vs. weak segment"
        if number:
            return f'{number} - {paren_title}'
        return paren_title
    if number:
        return f'{lib_type.capitalize()} {number}'
    return ''


def extract_candidates(pdf_path: str) -> list:
    doc      = fitz.open(pdf_path)
    filename = os.path.basename(pdf_path)
    pending  = None   # currently-open entry accumulator
    results  = []

    def flush(p):
        if p is None:
            return
        raw = (p.get('_body') or '').strip()
        if not raw:
            return          # ← skip entries with no content
        entry = {
            'type':        p['type'],
            'title':       p['title'] or p['type'].capitalize(),
            'content':     raw,
            'tags':        [],
            'keywords':    [],
            'relations':   [],
            'sourceTitle': filename,
            'pageRange':   p['page'],
        }
        results.append(entry)

    stopped = False

    for page_num in range(len(doc)):
        if stopped:
            break
        page  = doc.load_page(page_num)
        lines = get_lines(page)

        for line in lines:
            if not line or PAGE_ARTIFACT_RE.match(line):
                continue

            # Stop at references / bibliography section
            if HARD_STOP_RE.match(line):
                flush(pending)
                pending = None
                stopped = True
                break

            # MathBase embedded metadata pass-through
            if '[MB_B64]' in line or '[MB_END]' in line:
                if pending:
                    pending['_body'] = (pending.get('_body') or '') + '\n' + line
                continue

            parsed = try_parse_header(line)

            if parsed:
                flush(pending)
                lib_type, number, paren_title, rest = parsed
                pending = {
                    'type':  lib_type,
                    'title': build_title(lib_type, number, paren_title),
                    'page':  str(page_num + 1),
                    '_body': rest,
                }
            elif pending is not None:
                pending['_body'] = (pending.get('_body') or '') + '\n' + line

    flush(pending)

    # ── Post-process ──────────────────────────────────────────────────────────
    final = []
    for c in results:
        # MathBase lossless re-import: decode embedded Base64 metadata
        mb = re.search(
            r'\[\s*MB_B64\s*\](.*?)\s*\[\s*MB_END\s*\]',
            c['content'], re.DOTALL | re.IGNORECASE
        )
        if mb:
            try:
                b64 = re.sub(r'\s+', '', mb.group(1))
                meta = json.loads(base64.b64decode(b64).decode('utf-8'))
                c['content']  = meta.get('content', c['content'])
                c['type']     = meta.get('type', c['type'])
                c['tags']     = meta.get('tags', [])
                c['relations']= meta.get('relations', [])
                for r in c['relations']:
                    r.setdefault('confidence', 1.0)
                final.append(c)
                continue
            except Exception:
                pass

        content = clean_text(c['content'])
        # \[...\] display math → $$...$$
        content = re.sub(r'\\\[(.*?)\\\]', r'\n\n$$\1$$\n\n', content, flags=re.DOTALL)
        content = normalize_whitespace(content)

        if not content:
            continue        # still empty after cleaning → skip

        c['content']  = content
        c['tags']     = list(set(detect_tags(content, c.get('title', ''))))
        c['keywords'] = extract_keywords(content)
        final.append(c)

    return final


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import io as _io
    sys.stdout = _io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No PDF path provided'}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(json.dumps({'error': 'File not found'}))
        sys.exit(1)

    try:
        results = extract_candidates(pdf_path)
        print(json.dumps(results, ensure_ascii=False, indent=2))
    except Exception as e:
        import traceback
        print(json.dumps({'error': str(e), 'trace': traceback.format_exc()}))
        sys.exit(1)

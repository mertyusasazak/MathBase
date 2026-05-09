import fitz  # PyMuPDF
import json
import re
import sys
import os

# Common mathematical domains for tag detection
DOMAINS = {
    'analysis': ['limit', 'continuity', 'derivative', 'integral', 'measure', 'norm', 'convergence', 'sequence', 'series', 'function'],
    'topology': ['open set', 'closed set', 'compact', 'connected', 'homeomorphism', 'metric space', 'neighborhood'],
    'algebra': ['group', 'ring', 'field', 'ideal', 'module', 'homomorphism', 'isomorphism', 'vector space', 'linear'],
    'logic': ['proposition', 'predicate', 'axiom', 'proof', 'inference', 'quantifier', 'boolean'],
    'geometry': ['manifold', 'curvature', 'metric', 'geodesic', 'bundle', 'topology', 'surface']
}

def extract_candidates(pdf_path):
    doc = fitz.open(pdf_path)
    candidates = []
    
    # Regex patterns for identifying blocks
    patterns = [
        r"(Definition|Theorem|Lemma|Example|Corollary|Proposition|Remark|Note)\s+(\d+\.?\d*\.?\d*)\s*([\w\s]*)",
        r"(Definition|Theorem|Lemma|Example|Corollary|Proposition|Remark|Note):\s*([\w\s]*)",
        r"^(Definition|Theorem|Lemma|Example|Corollary|Proposition|Remark|Note)$"
    ]
    
    # Type mapping to align with app standard ENTRY_TYPES
    TYPE_MAPPING = {
        'proposition': 'theorem',
        'note': 'remark'
    }
    
    filename = os.path.basename(pdf_path)
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            is_header = False
            detected_type = ""
            detected_title = ""
            ref_id = "" # Used for internal relations (e.g. "Theorem 1.2")
            
            for p in patterns:
                match = re.match(p, line, re.IGNORECASE)
                if match:
                    raw_type = match.group(1).lower()
                    detected_type = TYPE_MAPPING.get(raw_type, raw_type)
                    
                    if len(match.groups()) >= 3:
                        ref_id = match.group(2).strip()
                        detected_title = match.group(3).strip()
                    elif len(match.groups()) >= 2:
                        detected_title = match.group(2).strip()
                    
                    is_header = True
                    break
            
            if is_header:
                candidates.append({
                    "type": detected_type,
                    "title": detected_title,
                    "ref_id": ref_id, # Temporary field for relation mapping
                    "content": "",
                    "tags": [],
                    "keywords": [],
                    "relations": [],
                    "sourceTitle": filename,
                    "pageRange": str(page_num + 1),
                    "expect_title": not detected_title # Internal flag
                })
            elif candidates:
                # If we hit a metadata header, stop capturing content for this block
                stop_words = ["TAGS", "KEYWORDS", "RELATIONSHIPS", "SOURCE:"]
                if any(line.upper().startswith(sw) for sw in stop_words):
                    candidates[-1]["expect_title"] = False # Stop looking for title if any
                    # We can't actually "stop" the elif from hitting for next lines, 
                    # but we can mark this candidate as "closed"
                    candidates[-1]["closed"] = True
                    continue
                
                if candidates[-1].get("closed"):
                    continue

                # If we were expecting a title for this candidate, take this line ONLY if it's short
                if candidates[-1].get("expect_title"):
                    if len(line) < 100 and not line.endswith('.'):
                        candidates[-1]["title"] = line
                    candidates[-1]["expect_title"] = False
                else:
                    candidates[-1]["content"] += line + " "

    # Clean up internal flags
    for c in candidates:
        if "expect_title" in c:
            del c["expect_title"]
        if "closed" in c:
            del c["closed"]
        if not c["title"]:
            c["title"] = c["type"].capitalize()

    # Post-processing: Tags, Keywords, and Relations
    for i, c in enumerate(candidates):
        content_lower = c["content"].lower()
        title_lower = c["title"].lower()
        
        # 1. Automatic Tagging
        for domain, keywords in DOMAINS.items():
            if any(kw in content_lower or kw in title_lower for kw in keywords):
                if domain not in c["tags"]:
                    c["tags"].append(domain)
        
        # 2. Automatic Keywords (LaTeX symbols and capitalized terms)
        # Extract LaTeX symbols like \alpha, \sum, etc.
        latex_symbols = re.findall(r"\\\w+", c["content"])
        # Extract capitalized terms that might be important (e.g. "Hilbert Space")
        capitalized = re.findall(r"\b[A-Z][a-z]{3,}\b", c["content"])
        
        c["keywords"] = list(set(latex_symbols + capitalized))[:8] # Limit to 8 keywords
        
        # 3. Automatic Relation Detection REMOVED (Handled by API for better accuracy)
        pass

    # Clean up and remove temporary fields
    for c in candidates:
        content = c["content"].strip()
        # DEBUG: Print snippet of content to see what was extracted
        # print(f"DEBUG: Candidate {c['title']} start: {content[:100]}...", file=sys.stderr)
        
        # 4. Check for embedded MathBase metadata (Lossless Re-import)
        # Our export tool embeds Base64 encoded JSON metadata in [MB_B64]...[MB_END]
        import base64
        # Be loose with whitespace around markers
        mb_match = re.search(r"\[\s*MB_B64\s*\](.*?)\s*\[\s*MB_END\s*\]", content, re.DOTALL | re.IGNORECASE)
        if mb_match:
            try:
                # CRITICAL: Strip ALL whitespace (spaces, newlines) that PyMuPDF might have injected
                b64_str = re.sub(r"\s+", "", mb_match.group(1))
                decoded = base64.b64decode(b64_str).decode('utf-8')
                meta = json.loads(decoded)
                
                c["content"] = meta.get("content", c["content"])
                c["type"] = meta.get("type", c["type"])
                c["tags"] = meta.get("tags", c["tags"])
                # Ensure relations match the structured format
                c["relations"] = meta.get("relations", [])
                for rel in c["relations"]:
                    if "confidence" not in rel:
                        rel["confidence"] = 1.0
            except Exception as e:
                pass
            
            if "expect_title" in c:
                del c["expect_title"]
            continue

        # 5. Math Cleaning & Normalization (Heuristic for generic PDFs)
        ligatures = {
            '\uf001': 'fi', '\uf002': 'fl', '\uf003': 'ff', '\uf004': 'ffi', '\uf005': 'ffl',
            'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl'
        }
        for lig, rep in ligatures.items():
            content = content.replace(lig, rep)
            
        # Fix common mangled math symbols (heuristic)
        math_fixes = {
            ' ∑ ': ' \\sum ', ' ∏ ': ' \\prod ', ' ∫ ': ' \\int ',
            ' ∀ ': ' \\forall ', ' ∃ ': ' \\exists ', ' ∈ ': ' \\in ',
            ' ⊂ ': ' \\subset ', ' ∪ ': ' \\cup ', ' ∩ ': ' \\cap ',
            ' → ': ' \\to ', ' ⇒ ': ' \\implies ', ' ⇔ ': ' \\iff ',
            ' α ': ' \\alpha ', ' β ': ' \\beta ', ' γ ': ' \\gamma ',
            ' δ ': ' \\delta ', ' θ ': ' \\theta ', ' λ ': ' \\lambda ',
            ' μ ': ' \\mu ', ' π ': ' \\pi ', ' σ ': ' \\sigma ',
            ' φ ': ' \\phi ', ' ω ': ' \\omega ', ' Ω ': ' \\Omega ',
            ' ∆ ': ' \\Delta ', ' ∇ ': ' \\nabla ', ' ∂ ': ' \\partial ',
            ' ≈ ': ' \\approx ', ' ≠ ': ' \\neq ', ' ≤ ': ' \\le ', ' ≥ ': ' \\ge '
        }
        for bad, good in math_fixes.items():
            content = content.replace(bad, good)
            
        # Try to ensure display math is on its own line if it looks like it
        content = re.sub(r'\\\[(.*?)\\\]', r'\n\n$$\1$$\n\n', content)
        
        c["content"] = content
        del c["ref_id"]
        
    return candidates

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No PDF path provided"}))
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)
        
    try:
        results = extract_candidates(pdf_path)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

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
    # Looking for: Type [Number] [Title] or Type: Title
    patterns = [
        r"(Definition|Theorem|Lemma|Example|Corollary|Proposition)\s+(\d+\.?\d*\.?\d*)\s*([\w\s]*)",
        r"(Definition|Theorem|Lemma|Example|Corollary|Proposition):\s*([\w\s]*)"
    ]
    
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
                    detected_type = match.group(1).lower()
                    
                    if len(match.groups()) >= 3:
                        ref_id = match.group(2).strip()
                        detected_title = match.group(3).strip()
                    elif len(match.groups()) >= 2:
                        detected_title = match.group(2).strip()
                    
                    if not detected_title:
                        detected_title = f"{detected_type.capitalize()} {ref_id}" if ref_id else detected_type.capitalize()
                    
                    is_header = True
                    break
            
            if is_header:
                candidates.append({
                    "type": detected_type,
                    "title": detected_title,
                    "ref_id": ref_id, # Temporary field for relation mapping
                    "content": "",
                    "tags": [detected_type],
                    "keywords": [],
                    "relations": [],
                    "sourceTitle": filename,
                    "pageRange": str(page_num + 1)
                })
            elif candidates:
                candidates[-1]["content"] += line + " "

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
        
        # 3. Automatic Relation Detection (Internal Cross-references)
        for other in candidates:
            if other == c: continue
            # Look for "Type Number" of other candidates in current candidate's content
            if other["ref_id"]:
                search_term = rf"{other['type']}\s+{re.escape(other['ref_id'])}"
                if re.search(search_term, c["content"], re.IGNORECASE):
                    if other["title"] not in c["relations"]:
                        c["relations"].append(other["title"])

    # Clean up and remove temporary fields
    for c in candidates:
        content = c["content"].strip()
        
        # 4. Math Cleaning & Normalization
        # Fix common PDF extraction ligatures
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

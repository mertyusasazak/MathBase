const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'qwen/qwen3-vl-235b-a22b-thinking';

// System prompt for the main explanation assistant
const MATH_SYSTEM_PROMPT = `You are a high-level STEM and Mathematics assistant. 
Explain mathematical theorems, definitions, and examples with extreme precision.
Always use $ for inline and $$ for block math.`;

function getKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is missing');
  return key;
}

async function aiGenerate(userPrompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = getKey();

  // Build messages array dynamically
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({
    role: 'user',
    content: [{ type: "text", text: userPrompt }]
  });

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-OpenRouter-Title': 'MathBase'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages,
      // max_tokens: 500, // Increased for detailed math proofs
      temperature: 0.1, // Lower temperature for mathematical precision
      provider: {
        order: ["Alibaba"],
        allow_fallbacks: false
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("🚨 OpenRouter API Rejected! Details:", errText);
    throw new Error(`API Error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function aiGenerateVision(base64Images: string[], systemPrompt: string): Promise<string> {
  const apiKey = getKey();

  const content: any[] = [{ type: "text", text: "Please accurately transcribe the mathematical content in these pages." }];

  for (const b64 of base64Images) {
    // Add image 
    content.push({
      type: "image_url",
      image_url: {
        url: b64 // Ensure it has Data URL format like: data:image/jpeg;base64,...
      }
    });
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: content }
  ];

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-OpenRouter-Title': 'MathBase'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages,
      temperature: 0.1,
      provider: {
        order: ["Alibaba"],
        allow_fallbacks: false
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("🚨 OpenRouter API Rejected! Details:", errText);
    throw new Error(`Vision API Error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
export async function suggestTags(title: string, content: string, existingTags: string[]): Promise<string[]> {
  const systemInstructions = "You are a math taxonomy assistant. Respond ONLY with a JSON array.";
  const prompt = `Suggest relevant tags.
Existing tags: ${existingTags.join(', ')}
Entry title: ${title}
Content: ${content.slice(0, 600)}`;

  try {
    const text = await aiGenerate(prompt, systemInstructions);
    return JSON.parse(text.match(/\[.*\]/s)?.[0] || '[]');
  } catch { return []; }
}

export async function suggestRefs(title: string, content: string, allEntries: { id: number; title: string; type: string; tags: string[] }[]): Promise<number[]> {
  if (allEntries.length === 0) return [];
  const systemInstructions = "Identify dependencies. Return ONLY a JSON array of IDs.";
  const entryList = allEntries.map(e => `ID ${e.id}: [${e.type}] "${e.title}"`).join('\n');
  const prompt = `Available entries:\n${entryList}\nNew entry title: ${title}\nContent: ${content.slice(0, 600)}`;

  try {
    const text = await aiGenerate(prompt, systemInstructions);
    return JSON.parse(text.match(/\[.*\]/s)?.[0] || '[]');
  } catch { return []; }
}

export async function explainEntry(entry: { type: string; title: string; content: string }, question: string): Promise<ReadableStream> {
  const userPrompt = `Context - ${entry.type}: "${entry.title}"\nContent: ${entry.content}\nQuestion: ${question}`;

  return new ReadableStream({
    async start(controller) {
      try {
        // Here we pass the MATH_SYSTEM_PROMPT to the generator
        const text = await aiGenerate(userPrompt, MATH_SYSTEM_PROMPT);
        controller.enqueue(new TextEncoder().encode(text));
      } catch (error: any) {
        console.error("Stream error:", error);
        controller.enqueue(new TextEncoder().encode(`System Error: ${error.message}`));
      }
      controller.close();
    }
  });
}

// Helper functions for similarity (Embeddings)
export async function reconstructMath(text: string): Promise<string> {
  const systemPrompt = `You are an expert mathematician and LaTeX editor. 
You are given a mathematical text extracted from a PDF where formulas have been corrupted by a raw text parser (e.g., superscripts flattened like x2 instead of x^2, matrices broken, missing integral signs, broken Greek letters).
Your task is to logically deduce the original mathematical meaning from the context and output the exact same text, but with all mathematical formulas perfectly rewritten in valid LaTeX (use $ for inline and $$ for display math).
Do not add conversational fluff or explanations. Return ONLY the reconstructed text.`;
  try {
    const textOut = await aiGenerate(text, systemPrompt);
    return textOut || text;
  } catch (error) {
    console.error("Failed to reconstruct math:", error);
    return text; // Fallback to original
  }
}

export function computeSimpleEmbedding(text: string): number[] {
  const mathTerms = [
    'vector', 'space', 'linear', 'continuous', 'compact', 'bounded', 'norm', 'metric',
    'topology', 'open', 'closed', 'dense', 'complete', 'convergent', 'cauchy', 'hilbert',
    'banach', 'operator', 'functional', 'measurable', 'integral', 'derivative', 'manifold',
    'group', 'ring', 'field', 'module', 'algebra', 'morphism', 'isomorphism', 'homomorphism',
    'sequence', 'series', 'limit', 'differential', 'equation', 'matrix', 'eigenvalue',
    'spectrum', 'kernel', 'image', 'basis', 'dimension'
  ];
  const lower = text.toLowerCase();
  return mathTerms.map(term => {
    const count = (lower.match(new RegExp(term, 'g')) || []).length;
    return Math.min(count / 5, 1);
  });
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return normA && normB ? dot / (normA * normB) : 0;
}
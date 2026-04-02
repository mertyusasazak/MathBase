// lib/duplicates.ts
// Duplicate detection using existing embedding + cosine similarity

import { computeSimpleEmbedding, cosineSimilarity } from '@/lib/services/ai'

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

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
}

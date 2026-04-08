import { scoreChunks } from '../providers/completionProvider.js';
import type { ScoredChunk } from '../repositories/chunkRepository.js';

export interface RankedChunkType extends ScoredChunk {
    rerankScore: number;
    vectorScore: number; // preserve original for logging
}

// Reranks a set of chunks based on their relevance to the question using an LLM. Returns the topK ranked chunks with their original vector search scores and new rerank scores.
export async function rerankChunks(
    question: string,
    chunks: ScoredChunk[],
    topK: number = 8
): Promise<RankedChunkType[]> {
    if (chunks.length === 0) return [];

    // Skip reranking if the retrieval set is already small —
    // the overhead isn't worth it under this threshold
    if (chunks.length <= topK) {
        return chunks.map(c => ({
            ...c.toObject(),
            rerankScore: c.score,
            vectorScore: c.score,
        }));
    }

    const scores = await scoreChunks(question, chunks);

    const ranked = chunks
        .map((chunk, i) => ({
            ...chunk.toObject(),
            rerankScore: scores[i] ?? 0,
            vectorScore: chunk.score,
        }))
        .sort((a, b) => b.rerankScore - a.rerankScore)
        .slice(0, topK);

    return ranked;
}

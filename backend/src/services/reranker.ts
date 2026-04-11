import { scoreChunks } from '../providers/completionProvider.js';
import type { ScoredChunk } from '../repositories/chunkRepository.js';
import logger from '../lib/logger.js';

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
        return chunks.map(c => {
            if (c && typeof c === 'object' && typeof c.toObject === 'function') {
                return {
                    ...c.toObject(),
                    rerankScore: c.score,
                    vectorScore: c.score,
                };
            } else if (c && typeof c === 'object') {
                return {
                    ...c,
                    rerankScore: c.score,
                    vectorScore: c.score,
                };
            } else {
                logger.warn('Warning: Unexpected chunk type in rerankChunks:', c);
                return {
                    rerankScore: 0,
                    vectorScore: 0,
                };
            }
        });
    }

    const scores = await scoreChunks(question, chunks);

    const ranked = chunks
        .map((chunk, i) => {
            if (chunk && typeof chunk === 'object' && typeof chunk.toObject === 'function') {
                return {
                    ...chunk.toObject(),
                    rerankScore: scores[i] ?? 0,
                    vectorScore: chunk.score,
                };
            } else if (chunk && typeof chunk === 'object') {
                return {
                    ...chunk,
                    rerankScore: scores[i] ?? 0,
                    vectorScore: chunk.score,
                };
            } else {
                logger.warn('Warning: Unexpected chunk type in rerankChunks:', chunk);
                return {
                    rerankScore: 0,
                    vectorScore: 0,
                };
            }
        })
        .sort((a, b) => b.rerankScore - a.rerankScore)
        .slice(0, topK);

    return ranked;
}

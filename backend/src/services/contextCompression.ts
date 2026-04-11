import { compressChunk } from '../providers/completionProvider.js';
import type { CompressedChunkType } from '../providers/completionProvider.js';
import type { RankedChunkType } from './reranker.js';
import logger from '../lib/logger.js';

// Threshold in characters — roughly compressionThreshold / 4 ≈ tokens
// If the total context exceeds this, try to compress it by summarizing less relevant chunks using the LLM
export async function compressContext(
    question: string,
    chunks: RankedChunkType[],
    compressionThreshold = 10_000
): Promise<CompressedChunkType[]> {
    const totalChars = chunks.reduce((sum, c) => sum + c.content.length, 0);

    // Don't compress if we're under the threshold
    if (totalChars <= compressionThreshold) {
        return chunks.map(c => {
            if (c && typeof c === 'object' && typeof c.toObject === 'function') {
                return {
                    ...c.toObject(),
                    originalContent: c.content,
                    compressed: false,
                };
            } else if (c && typeof c === 'object') {
                return {
                    ...c,
                    originalContent: c.content,
                    compressed: false,
                };
            } else {
                logger.warn('Warning: Unexpected chunk type in compressContext:', c);
                return {
                    originalContent: '',
                    compressed: false,
                };
            }
        });
    }

    // Compress each chunk in parallel
    const compressed = await Promise.all(chunks.map(chunk => compressChunk(question, chunk)));

    return compressed;
}

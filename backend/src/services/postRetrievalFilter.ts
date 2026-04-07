import type { ScoredChunk } from '../repositories/chunkRepository.js';

export interface PostRetrievalFilterOptions {
    scoreThreshold?: number; // drop chunks below this cosine similarity
    maxPerFile?: number; // max chunks from a single file
    directory?: string; // fuzzy match on parentDir metadata field, e.g. "services" matches "src/services"
}

export function applyPostRetrievalFilters(
    chunks: ScoredChunk[],
    options: PostRetrievalFilterOptions = {}
): ScoredChunk[] {
    const { scoreThreshold = 0.75, maxPerFile = 3, directory } = options;

    let filtered = chunks;

    // Filter 1 - Score threshold - this is the most important filter for relevance. Tune it based on your needs and embedding quality. Start high (e.g. 0.8) and lower if you need more results.
    filtered = filtered.filter(c => c.score >= scoreThreshold);

    // Filter 2 - Directory filter - if the query specified a directory, filter to chunks whose parentDir metadata field includes that string (case-insensitive, fuzzy match).
    if (directory) {
        const dir = directory.toLowerCase();
        filtered = filtered.filter(c => c.metadata.parentDir?.toLowerCase().includes(dir));
    }

    // Filter 3 - Overlap deduplication - remove chunks that have significant line overlap with a higher-scoring chunk from the same file. This prevents redundancy in the context window.
    filtered = deduplicateOverlappingChunks(filtered);

    // Filter 4 - Max chunks per file - to ensure diversity of sources in the results, limit the number of chunks from the same file. This is a simple heuristic and can be tuned or removed based on your needs.
    const countPerFile = new Map<string, number>();

    filtered = filtered.filter(chunk => {
        const key = chunk.metadata.relativePath;
        if (!key) return true; // should not happen, but just in case
        const count = countPerFile.get(key) ?? 0;
        if (count >= maxPerFile) return false;
        countPerFile.set(key, count + 1);
        return true;
    });

    return filtered;
}

function deduplicateOverlappingChunks(chunks: ScoredChunk[]): ScoredChunk[] {
    const kept: ScoredChunk[] = [];

    for (const candidate of chunks) {
        const overlapsKept = kept.some(k => {
            if (k.metadata.relativePath !== candidate.metadata.relativePath) {
                return false;
            }

            if (
                !k.metadata.startLine ||
                !k.metadata.endLine ||
                !candidate.metadata.startLine ||
                !candidate.metadata.endLine
            ) {
                return false; // if line info is missing, we can't determine overlap, so we err on the side of keeping both
            }

            return (
                overlapRatio(
                    k.metadata.startLine,
                    k.metadata.endLine,
                    candidate.metadata.startLine,
                    candidate.metadata.endLine
                ) > 0.5
            );
        });

        if (!overlapsKept) kept.push(candidate);
    }

    return kept;
}

function overlapRatio(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEnd, bEnd);
    const overlapLength = Math.max(0, overlapEnd - overlapStart);
    const shorter = Math.min(aEnd - aStart, bEnd - bStart);
    return shorter === 0 ? 0 : overlapLength / shorter;
}

import type { ScoredChunk } from '../repositories/chunkRepository.js';
import logger from '../lib/logger.js';

export interface PostRetrievalFilterOptions {
    scoreThreshold?: number; // drop chunks below this cosine similarity
    maxPerFile?: number; // max chunks from a single file
    maxPerFileDiverse?: number; // if the set is very diverse, allow less chunks per file
    directory?: string; // fuzzy match on parentDir metadata field, e.g. "services" matches "src/services"
    fileSkipScoreThreshold?: number; // if all chunks from a file are above this score, skip the per-file cap for that file
    dominantFilePctThreshold?: number; // if the dominant file has more than this percentage of the chunks, skip the per-file cap
    dominantDiversityFilePctThreshold?: number; // if the dominant file has more than this percentage of the chunks, but the overall set is very diverse
}

export function applyPostRetrievalFilters(
    chunks: ScoredChunk[],
    query: string,
    options: PostRetrievalFilterOptions = {}
): ScoredChunk[] {
    const {
        scoreThreshold = 0.75,
        maxPerFile = 3,
        maxPerFileDiverse = 2,
        directory,
        fileSkipScoreThreshold = 0.75,
        dominantFilePctThreshold = 80,
        dominantDiversityFilePctThreshold = 40,
    } = options;

    let filtered = chunks;

    // Filter 1 - Score threshold - this is the most important filter for relevance. Tune it based on your needs and embedding quality. Start high (e.g. 0.8) and lower if you need more results.
    filtered = filtered.filter(c => c.score >= scoreThreshold);

    logger.info(
        `STAGE: SCORE THRESHOLD - Raw chunks metadata and scores: ${filtered
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})` + '\n')
            .join(', ')}`
    );

    // Filter 2 - Directory filter - if the query specified a directory, filter to chunks whose parentDir metadata field includes that string (case-insensitive, fuzzy match).
    if (directory) {
        const dir = directory.toLowerCase();
        filtered = filtered.filter(c => c.metadata.parentDir?.toLowerCase().includes(dir));
    }

    logger.info(
        `STAGE: DIRECTORY FILTER - Raw chunks metadata and scores: ${filtered
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})` + '\n')
            .join(', ')}`
    );

    // Filter 3 - Overlap deduplication - remove chunks that have significant line overlap with a higher-scoring chunk from the same file. This prevents redundancy in the context window.
    filtered = deduplicateOverlappingChunks(filtered);

    logger.info(
        `STAGE: OVERLAP DEDUPLICATION - Raw chunks metadata and scores: ${filtered
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})` + '\n')
            .join(', ')}`
    );

    if (filtered.length === 0) return filtered;

    // Filter 4 - Noise filter - remove chunks that are likely to be noise based on file path patterns and question type (e.g. implementation vs. documentation question)
    filtered = applyNoiseFilter(filtered, query);

    logger.info(
        `STAGE: NOISE FILTER - Raw chunks metadata and scores: ${filtered
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})` + '\n')
            .join(', ')}`
    );

    // Filter 5 - Per-file cap — skip if the user is clearly targeting a specific file
    const isSmallSet = filtered.length <= 4;
    const isAllFromSameFile = filtered.every(
        chunk => chunk.metadata.relativePath === filtered[0]?.metadata.relativePath
    );

    const isHighConfidence = filtered.every(chunk => chunk.score >= fileSkipScoreThreshold);

    const diversity = getChunkDiversity(filtered);

    const skipCap =
        (isAllFromSameFile && isHighConfidence) ||
        (!isSmallSet && diversity.dominantFilePct >= dominantFilePctThreshold) ||
        (isSmallSet && isAllFromSameFile);
    const fileCap = skipCap
        ? 6
        : diversity.dominantFilePct > dominantDiversityFilePctThreshold
          ? maxPerFileDiverse
          : maxPerFile;
    filtered = applyPerFileCap(filtered, fileCap);

    return filtered;
}

// HELPERS FOR FILTER 3

// This function removes chunks that have more than 50% line overlap with a higher-scoring chunk from the same file. It assumes that the input chunks are sorted by score in descending order.
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

// HELPERS FOR FILTER 4

// Returns the overlap between two line ranges
function overlapRatio(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEnd, bEnd);
    const overlapLength = Math.max(0, overlapEnd - overlapStart);
    const shorter = Math.min(aEnd - aStart, bEnd - bStart);
    return shorter === 0 ? 0 : overlapLength / shorter;
}

// Applies a cap on the number of chunks from the same file
function applyPerFileCap(chunks: ScoredChunk[], maxPerFile: number): ScoredChunk[] {
    const countPerFile = new Map<string, number>();

    return chunks.filter(chunk => {
        const key = chunk.metadata.relativePath;
        if (!key) return true; // should not happen, but just in case
        const count = countPerFile.get(key) ?? 0;
        if (count >= maxPerFile) return false;
        countPerFile.set(key, count + 1);
        return true;
    });
}

// Analyze the diversity of the given chunks
function getChunkDiversity(chunks: ScoredChunk[]): {
    uniqueFiles: number;
    uniqueDirectories: number;
    dominantFile: string;
    dominantFileCount: number;
    dominantFilePct: number;
} {
    const fileCounts = new Map<string, number>();
    const dirCounts = new Set<string>();

    for (const chunk of chunks) {
        const path = chunk.metadata.relativePath;

        if (!path) continue; // should not happen, but just in case
        if (chunk.metadata.parentDir) {
            dirCounts.add(chunk.metadata.parentDir);
        }

        fileCounts.set(path, (fileCounts.get(path) ?? 0) + 1);
        if (chunk.metadata.parentDir) {
            dirCounts.add(chunk.metadata.parentDir);
        }
    }

    const dominantEntry = [...fileCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!dominantEntry) {
        return {
            uniqueFiles: 0,
            uniqueDirectories: 0,
            dominantFile: '',
            dominantFileCount: 0,
            dominantFilePct: 0,
        };
    }
    const dominantFilePct = Math.round((dominantEntry[1] / chunks.length) * 100);

    const uniqueFiles = fileCounts.size;
    const uniqueDirectories = dirCounts.size;

    return {
        uniqueFiles,
        uniqueDirectories,
        dominantFile: dominantEntry[0],
        dominantFileCount: dominantEntry[1],
        dominantFilePct,
    };
}

const NOISE_PATTERNS = [
    // Entry points — skipped for setup/bootstrap questions
    { pattern: /^(index|server|app)\.(js|ts)$/, bypassFor: 'entrypoint' },
    // Database infrastructure (not models)
    { pattern: /connection\.(js|ts)$/, bypassFor: 'entrypoint' },
    // Constants and enums
    { pattern: /constants?\//, bypassFor: null },
    { pattern: /events?\.(js|ts)$/, bypassFor: null },
    // Logging middleware
    { pattern: /logging\.(js|ts)$/, bypassFor: null },
    // Documentation
    { pattern: /\.md$/, bypassFor: 'documentation' },
    { pattern: /^frontend\//, bypassFor: 'frontend' },
];

const BYPASS_KEYWORDS: Record<string, string[]> = {
    documentation: [
        'readme',
        'overview',
        'architecture',
        'structure',
        'setup',
        'how is the project',
        'what does this repo',
        'what is this',
        'documentation',
        'how to run',
        'getting started',
    ],
    entrypoint: [
        'index',
        'entry',
        'server setup',
        'bootstrap',
        'initialize',
        'how is the server',
        'how are handlers registered',
        'how are routes',
        'how are sockets registered',
        'startup',
        'how does the app start',
    ],
    frontend: [
        'frontend',
        'client',
        'client-side',
        'react',
        'reconnection strategy',
        'socket config',
        'socket options',
    ],
};

function getActiveBypassCategories(question: string): Set<string> {
    const q = question.toLowerCase();
    const active = new Set<string>();

    for (const [category, keywords] of Object.entries(BYPASS_KEYWORDS)) {
        if (keywords.some(keyword => q.includes(keyword))) {
            active.add(category);
        }
    }

    return active;
}

function applyNoiseFilter(chunks: ScoredChunk[], question: string): ScoredChunk[] {
    const activeBypass = getActiveBypassCategories(question);

    return chunks.filter(chunk => {
        if (!chunk.metadata.relativePath) return true; // should not happen, but just in case

        const path = chunk.metadata.relativePath.toLowerCase();

        return !NOISE_PATTERNS.some(({ pattern, bypassFor }) => {
            if (bypassFor && activeBypass.has(bypassFor)) return false;
            return pattern.test(path);
        });
    });
}

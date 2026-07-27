import type { ScoredChunk } from '../../src/repositories/chunkRepository.js';

export function makeRankedChunk({
    content,
    score = 0.4,
    rerankScore = 0.4,
    vectorScore = 0.4,
    startLine = 1,
    endLine = 3,
}: {
    content: string;
    score?: number;
    rerankScore?: number;
    vectorScore?: number;
    startLine?: number;
    endLine?: number;
}) {
    return {
        content,
        embedding: [0.1, 0.2, 0.3],
        metadata: {
            relativePath: 'src/example.ts',
            startLine,
            endLine,
        },
        score,
        rerankScore,
        vectorScore,
    };
}

export function buildChunk(
    relativePath: string,
    score: number,
    parentDir = 'src/services',
    startLine = 1,
    endLine = 20
): ScoredChunk {
    return {
        score,
        metadata: {
            relativePath,
            parentDir,
            startLine,
            endLine,
        },
    } as ScoredChunk;
}

export function makeChunk(overrides?: Partial<ScoredChunk>): ScoredChunk {
    return {
        content: 'export function auth() { return true; }',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
            repoURL: 'https://github.com/acme/repo',
            relativePath: 'src/auth.ts',
            fileName: 'auth.ts',
            name: 'auth',
            type: 'function',
            language: 'typescript',
            startLine: 10,
            endLine: 20,
        },
        score: 0.91,
        ...overrides,
    } as ScoredChunk;
}

export const baseChunk = {
    chunk: 'function test() {}',
    embeddingText: 'some code',
    relativePath: 'src/example.ts',
    fileName: 'example.ts',
    name: 'test',
    type: 'function',
    language: 'typescript',
    parentDir: 'src',
    startLine: 1,
    endLine: 10,
} as any;

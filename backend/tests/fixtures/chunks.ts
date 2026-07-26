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

import { buildQuery } from '../../src/services/queryBuilder.js';
import type { ScoredChunk } from '../../src/repositories/chunkRepository.js';
import { makeChunk } from '../fixtures/chunks.js';

describe('buildQuery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns a clear empty-context prompt when no chunks are provided', () => {
        const result = buildQuery('Where is auth handled?', [], 'https://github.com/acme/repo');

        expect(result.systemPrompt).toContain('https://github.com/acme/repo');
        expect(result.systemPrompt).toContain('No relevant code chunks were found');
        expect(result.userMessage).toBe('Where is auth handled?');
        expect(result.contextStats).toEqual({
            chunkCount: 0,
            totalChars: 0,
            filesReferenced: [],
        });
    });

    it('formats each chunk into a labeled code block with the question appended', () => {
        const result = buildQuery(
            'How does auth work?',
            [makeChunk()],
            'https://github.com/acme/repo'
        );

        expect(result.systemPrompt).toContain('You are an expert code assistant');
        expect(result.userMessage).toContain('[Chunk 1]');
        expect(result.userMessage).toContain('File: src/auth.ts');
        expect(result.userMessage).toContain('Lines: 10–20');
        expect(result.userMessage).toContain('Language: typescript');
        expect(result.userMessage).toContain('Relevance: 91%');
        expect(result.userMessage).toContain('```typescript');
        expect(result.userMessage).toContain('Question: How does auth work?');
    });

    it('builds context stats from the provided chunks and preserves their file references', () => {
        const chunks = [
            makeChunk({
                content: 'const auth = true;',
                metadata: {
                    repoURL: 'https://github.com/acme/repo',
                    relativePath: 'src/auth.ts',
                    fileName: 'auth.ts',
                    name: 'auth',
                    type: 'variable',
                    language: 'typescript',
                    startLine: 3,
                    endLine: 5,
                },
            }),
            makeChunk({
                content: 'function login() {}',
                metadata: {
                    repoURL: 'https://github.com/acme/repo',
                    relativePath: 'src/login.ts',
                    fileName: 'login.ts',
                    name: 'login',
                    type: 'function',
                    language: 'javascript',
                    startLine: 8,
                    endLine: 12,
                },
            }),
        ];

        const result = buildQuery(
            'Where is login handled?',
            chunks,
            'https://github.com/acme/repo'
        );

        const firstChunk = chunks[0] as ScoredChunk;
        const secondChunk = chunks[1] as ScoredChunk;

        expect(result.contextStats.chunkCount).toBe(2);
        expect(result.contextStats.totalChars).toBe(
            firstChunk.content.length + secondChunk.content.length
        );
        expect(result.contextStats.filesReferenced).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ relativePath: 'src/auth.ts', startLine: 3, endLine: 5 }),
                expect.objectContaining({
                    relativePath: 'src/login.ts',
                    startLine: 8,
                    endLine: 12,
                }),
            ])
        );
    });
});

// Mock the whole completionProvider module before importing anything else.
jest.mock('../../src/providers/completionProvider.js', () => ({
    scoreChunks: jest.fn(),
}));

import { scoreChunks } from '../../src/providers/completionProvider.js';
import { rerankChunks } from '../../src/services/reranker.js';
import type { ScoredChunk } from '../../src/repositories/chunkRepository.js';

const mockScoreChunks = scoreChunks as jest.Mock;

describe('reranker — rerankChunks', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('returns an empty array immediately when no chunks are provided', async () => {
        const result = await rerankChunks('some question', []);

        expect(result).toEqual([]);
        expect(mockScoreChunks).not.toHaveBeenCalled();
    });

    it('skips reranking and preserves original scores when the chunk list is smaller than or equal to topK', async () => {
        const chunks = [
            {
                _id: '1',
                content: 'first chunk',
                embedding: [],
                metadata: { relativePath: 'file1.ts', startLine: 1, endLine: 1 },
                score: 0.25,
            },
            {
                _id: '2',
                content: 'second chunk',
                embedding: [],
                metadata: { relativePath: 'file2.ts', startLine: 2, endLine: 2 },
                score: 0.75,
            },
        ] as unknown as ScoredChunk[];

        const result = await rerankChunks('any question', chunks, 2);

        expect(mockScoreChunks).not.toHaveBeenCalled();
        expect(result).toEqual([
            {
                ...chunks[0],
                rerankScore: 0.25,
                vectorScore: 0.25,
            },
            {
                ...chunks[1],
                rerankScore: 0.75,
                vectorScore: 0.75,
            },
        ]);
    });

    it('skips reranking and preserves original scores when the chunk list is smaller than or equal to default topK', async () => {
        const chunks = [
            {
                _id: '1',
                content: 'first chunk',
                embedding: [],
                metadata: { relativePath: 'file1.ts', startLine: 1, endLine: 1 },
                score: 0.25,
            },
            {
                _id: '2',
                content: 'second chunk',
                embedding: [],
                metadata: { relativePath: 'file2.ts', startLine: 2, endLine: 2 },
                score: 0.75,
            },
        ] as unknown as ScoredChunk[];

        const result = await rerankChunks('any question', chunks);

        expect(mockScoreChunks).not.toHaveBeenCalled();
        expect(result).toEqual([
            {
                ...chunks[0],
                rerankScore: 0.25,
                vectorScore: 0.25,
            },
            {
                ...chunks[1],
                rerankScore: 0.75,
                vectorScore: 0.75,
            },
        ]);
    });

    it('calls scoreChunks with the original question and chunks when reranking is needed', async () => {
        const chunks = [
            {
                _id: '1',
                content: 'first chunk',
                embedding: [],
                metadata: { relativePath: 'file1.ts', startLine: 1, endLine: 1 },
                score: 0.2,
            },
            {
                _id: '2',
                content: 'second chunk',
                embedding: [],
                metadata: { relativePath: 'file2.ts', startLine: 2, endLine: 2 },
                score: 0.3,
            },
            {
                _id: '3',
                content: 'third chunk',
                embedding: [],
                metadata: { relativePath: 'file3.ts', startLine: 3, endLine: 3 },
                score: 0.4,
            },
        ] as unknown as ScoredChunk[];

        mockScoreChunks.mockResolvedValueOnce([0.1, 0.8, 0.5]);

        await rerankChunks('relevant question', chunks, 2);

        expect(mockScoreChunks).toHaveBeenCalledTimes(1);
        expect(mockScoreChunks).toHaveBeenCalledWith('relevant question', chunks);
    });

    it('returns the topK chunks sorted by rerankScore and preserves the original vectorScore', async () => {
        const chunks = [
            {
                _id: '1',
                content: 'first chunk',
                embedding: [],
                metadata: { relativePath: 'file1.ts', startLine: 1, endLine: 1 },
                score: 0.2,
            },
            {
                _id: '2',
                content: 'second chunk',
                embedding: [],
                metadata: { relativePath: 'file2.ts', startLine: 2, endLine: 2 },
                score: 0.3,
            },
            {
                _id: '3',
                content: 'third chunk',
                embedding: [],
                metadata: { relativePath: 'file3.ts', startLine: 3, endLine: 3 },
                score: 0.4,
            },
            {
                _id: '4',
                content: 'fourth chunk',
                embedding: [],
                metadata: { relativePath: 'file4.ts', startLine: 4, endLine: 4 },
                score: 0.5,
            },
        ] as unknown as ScoredChunk[];

        mockScoreChunks.mockResolvedValueOnce([0.15, 0.95, 0.5, 0.8]);

        const result = await rerankChunks('rank these', chunks, 2);

        expect(result).toEqual([
            {
                ...chunks[1],
                rerankScore: 0.95,
                vectorScore: 0.3,
            },
            {
                ...chunks[3],
                rerankScore: 0.8,
                vectorScore: 0.5,
            },
        ]);
    });

    it('uses zero for any returned score that is missing or undefined', async () => {
        const chunks = [
            {
                _id: '1',
                content: 'chunk one',
                embedding: [],
                metadata: { relativePath: 'file1.ts', startLine: 1, endLine: 1 },
                score: 0.2,
            },
            {
                _id: '2',
                content: 'chunk two',
                embedding: [],
                metadata: { relativePath: 'file2.ts', startLine: 2, endLine: 2 },
                score: 0.4,
            },
            {
                _id: '3',
                content: 'chunk three',
                embedding: [],
                metadata: { relativePath: 'file3.ts', startLine: 3, endLine: 3 },
                score: 0.6,
            },
        ] as unknown as ScoredChunk[];

        mockScoreChunks.mockResolvedValueOnce([0.7]);

        const result = await rerankChunks('question', chunks, 2);

        expect(result).toEqual([
            {
                ...chunks[0],
                rerankScore: 0.7,
                vectorScore: 0.2,
            },
            {
                ...chunks[1],
                rerankScore: 0,
                vectorScore: 0.4,
            },
        ]);
    });

    it('propagates errors from scoreChunks instead of swallowing them', async () => {
        const chunks = Array.from({ length: 9 }, (_, index) => ({
            _id: String(index + 1),
            content: `chunk ${index + 1}`,
            embedding: [],
            metadata: {
                relativePath: `file${index + 1}.ts`,
                startLine: index + 1,
                endLine: index + 1,
            },
            score: 0.1 * (index + 1),
        })) as unknown as ScoredChunk[];

        mockScoreChunks.mockRejectedValueOnce(new Error('LLM service failure'));

        await expect(rerankChunks('some question', chunks)).rejects.toThrow('LLM service failure');
    });
});

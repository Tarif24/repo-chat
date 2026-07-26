jest.mock('../../src/repositories/chunkRepository.js', () => ({
    createChunk: jest.fn(),
    vectorSearch: jest.fn(),
}));

jest.mock('../../src/providers/embeddingProvider.js', () => ({
    createEmbedding: jest.fn(),
}));

jest.mock('../../src/lib/logger.js', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

import { createChunk, vectorSearch } from '../../src/repositories/chunkRepository.js';
import { createEmbedding } from '../../src/providers/embeddingProvider.js';
import logger from '../../src/lib/logger.js';
import {
    processAndStoreChunk,
    processAndStoreChunks,
    searchChunks,
} from '../../src/services/chunkProcessing.js';
import { CreationError, OpenAIError } from '../../src/error/appError.js';
import { baseChunk } from '../fixtures/chunks.js';

const mockCreateChunk = createChunk as jest.Mock;
const mockVectorSearch = vectorSearch as jest.Mock;
const mockCreateEmbedding = createEmbedding as jest.Mock;
const mockLoggerInfo = logger.info as jest.Mock;
const mockLoggerError = logger.error as jest.Mock;

describe('chunkProcessing service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates an embedding and stores the chunk with the expected metadata', async () => {
        mockCreateEmbedding.mockResolvedValueOnce([0.1, 0.2, 0.3]);
        mockCreateChunk.mockResolvedValueOnce({ id: 'chunk-1' });

        await processAndStoreChunk(baseChunk, 'https://example.com/repo');

        expect(mockCreateEmbedding).toHaveBeenCalledWith('some code');
        expect(mockCreateChunk).toHaveBeenCalledWith({
            content: 'function test() {}',
            embedding: [0.1, 0.2, 0.3],
            metadata: {
                repoURL: 'https://example.com/repo',
                relativePath: 'src/example.ts',
                fileName: 'example.ts',
                name: 'test',
                type: 'function',
                language: 'typescript',
                parentDir: 'src',
                startLine: 1,
                endLine: 10,
            },
        });
    });

    it('throws a CreationError when the embedding provider returns no embedding', async () => {
        mockCreateEmbedding.mockResolvedValueOnce(undefined);

        await expect(
            processAndStoreChunk(baseChunk, 'https://example.com/repo')
        ).rejects.toBeInstanceOf(CreationError);
        await expect(processAndStoreChunk(baseChunk, 'https://example.com/repo')).rejects.toThrow(
            'Failed to create embedding for chunk:'
        );
    });

    it('logs when the chunk is missing required metadata fields', async () => {
        const incompleteChunk = { ...baseChunk, startLine: undefined };
        mockCreateEmbedding.mockResolvedValueOnce([0.1, 0.2, 0.3]);
        mockCreateChunk.mockResolvedValueOnce({ id: 'chunk-2' });

        await processAndStoreChunk(incompleteChunk, 'https://example.com/repo');

        expect(mockLoggerInfo).toHaveBeenCalled();
        expect(mockCreateChunk).toHaveBeenCalled();
    });

    it('throws a CreationError when the repository cannot create the chunk', async () => {
        mockCreateEmbedding.mockResolvedValueOnce([0.1, 0.2, 0.3]);
        mockCreateChunk.mockResolvedValueOnce(undefined);

        await expect(
            processAndStoreChunk(baseChunk, 'https://example.com/repo')
        ).rejects.toBeInstanceOf(CreationError);
    });

    it('emits progress events while storing chunks and finishes successfully', async () => {
        const emit = jest.fn().mockResolvedValue(undefined);
        mockCreateEmbedding
            .mockResolvedValueOnce([0.1, 0.2, 0.3])
            .mockResolvedValueOnce([0.4, 0.5, 0.6]);
        mockCreateChunk.mockResolvedValue({ id: 'chunk' });

        await processAndStoreChunks(
            [baseChunk, { ...baseChunk, name: 'second' }],
            'https://example.com/repo',
            emit
        );

        expect(emit).toHaveBeenNthCalledWith(1, 'embeddingAndProcessing', {
            message: '1 / 2 chunks embedded',
            current: 1,
            totalChunks: 2,
        });
        expect(emit).toHaveBeenNthCalledWith(2, 'embeddingAndProcessing', {
            message: '2 / 2 chunks embedded',
            current: 2,
            totalChunks: 2,
        });
    });

    it('emits an error event and rethrows the original OpenAI error when chunk processing fails', async () => {
        const emit = jest.fn().mockResolvedValue(undefined);
        const openAIError = new OpenAIError('embedding failed');
        mockCreateEmbedding.mockRejectedValueOnce(openAIError);

        await expect(
            processAndStoreChunks([baseChunk], 'https://example.com/repo', emit)
        ).rejects.toThrow('embedding failed');

        expect(emit).toHaveBeenCalledWith('error', { message: 'embedding failed' });
        expect(mockLoggerError).toHaveBeenCalled();
    });

    it('wraps a non-OpenAI error in an AppError and emits an error event', async () => {
        const emit = jest.fn().mockResolvedValue(undefined);
        const regularError = new Error('db failed');
        mockCreateEmbedding.mockRejectedValueOnce(regularError);

        await expect(
            processAndStoreChunks([baseChunk], 'https://example.com/repo', emit)
        ).rejects.toMatchObject({
            message: 'Error processing chunk: db failed',
        });

        expect(emit).toHaveBeenCalledWith('error', { message: regularError });
    });

    it('returns vector search results from the repository', async () => {
        const expectedResults = [{ id: 'chunk-1', score: 0.9 }];
        mockVectorSearch.mockResolvedValueOnce(expectedResults);

        const result = await searchChunks({
            embedding: [0.1, 0.2],
            repoURL: 'https://example.com/repo',
        });

        expect(result).toEqual(expectedResults);
        expect(mockVectorSearch).toHaveBeenCalledWith({
            embedding: [0.1, 0.2],
            repoURL: 'https://example.com/repo',
        });
    });

    it('wraps vector search failures in an AppError', async () => {
        mockVectorSearch.mockRejectedValueOnce(new Error('search failed'));

        await expect(
            searchChunks({ embedding: [0.1, 0.2], repoURL: 'https://example.com/repo' })
        ).rejects.toMatchObject({
            message: 'Error searching chunks',
        });
    });
});

jest.mock('../../src/providers/embeddingProvider.js', () => ({
    createEmbedding: jest.fn(),
}));

jest.mock('../../src/services/semanticCache.js', () => ({
    cacheCheck: jest.fn(),
    cacheSave: jest.fn(),
}));

jest.mock('../../src/services/repoProcessing.js', () => ({
    getAllRepos: jest.fn(),
    updateRepoLastAccessed: jest.fn(),
    getRepoByURL: jest.fn(),
}));

jest.mock('../../src/services/queryInterpreter.js', () => ({
    interpretAndEmbedQuery: jest.fn(),
}));

jest.mock('../../src/services/postRetrievalFilter.js', () => ({
    applyPostRetrievalFilters: jest.fn(),
}));

jest.mock('../../src/services/chunkProcessing.js', () => ({
    searchChunks: jest.fn(),
}));

jest.mock('../../src/services/queryBuilder.js', () => ({
    buildQuery: jest.fn(),
}));

jest.mock('../../src/services/queryProcessor.js', () => ({
    processUserQuery: jest.fn(),
}));

jest.mock('../../src/services/reranker.js', () => ({
    rerankChunks: jest.fn(),
}));

jest.mock('../../src/services/contextCompression.js', () => ({
    compressContext: jest.fn(),
}));

jest.mock('../../src/services/guards.js', () => ({
    isRelevant: jest.fn(),
}));

jest.mock('../../src/lib/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

import { createEmbedding } from '../../src/providers/embeddingProvider.js';
import { cacheCheck, cacheSave } from '../../src/services/semanticCache.js';
import {
    getAllRepos,
    updateRepoLastAccessed,
    getRepoByURL,
} from '../../src/services/repoProcessing.js';
import { interpretAndEmbedQuery } from '../../src/services/queryInterpreter.js';
import { applyPostRetrievalFilters } from '../../src/services/postRetrievalFilter.js';
import { searchChunks } from '../../src/services/chunkProcessing.js';
import { buildQuery } from '../../src/services/queryBuilder.js';
import { processUserQuery } from '../../src/services/queryProcessor.js';
import { rerankChunks } from '../../src/services/reranker.js';
import { compressContext } from '../../src/services/contextCompression.js';
import { isRelevant } from '../../src/services/guards.js';
import logger from '../../src/lib/logger.js';
import {
    userQuery,
    getAllRepositories,
    getRepositoryByURL,
} from '../../src/controllers/queryController.js';

const mockCreateEmbedding = createEmbedding as jest.Mock;
const mockCacheCheck = cacheCheck as jest.Mock;
const mockCacheSave = cacheSave as jest.Mock;
const mockGetAllRepos = getAllRepos as jest.Mock;
const mockUpdateRepoLastAccessed = updateRepoLastAccessed as jest.Mock;
const mockGetRepoByURL = getRepoByURL as jest.Mock;
const mockInterpretAndEmbedQuery = interpretAndEmbedQuery as jest.Mock;
const mockApplyPostRetrievalFilters = applyPostRetrievalFilters as jest.Mock;
const mockSearchChunks = searchChunks as jest.Mock;
const mockBuildQuery = buildQuery as jest.Mock;
const mockProcessUserQuery = processUserQuery as jest.Mock;
const mockRerankChunks = rerankChunks as jest.Mock;
const mockCompressContext = compressContext as jest.Mock;
const mockIsRelevant = isRelevant as jest.Mock;
const mockLoggerInfo = logger.info as jest.Mock;
const mockLoggerWarn = logger.warn as jest.Mock;

describe('query controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // This checks that a relevant query goes through the whole retrieval pipeline and returns the answer.
    it('runs the full retrieval pipeline and returns the generated answer for a relevant query', async () => {
        const repoURL = 'https://example.com/repo';
        const query = 'How does authentication work?';
        const chatHistory = [{ role: 'user' as const, content: 'hello' }];
        const embedding = [0.1, 0.2, 0.3];
        const chunk = {
            metadata: { relativePath: 'src/auth.ts', startLine: 1, endLine: 5 },
            content: 'auth code',
            score: 0.9,
        };
        const contextStats = {
            chunkCount: 1,
            totalChars: 9,
            filesReferenced: [{ relativePath: 'src/auth.ts' }],
        };

        mockIsRelevant.mockResolvedValueOnce({ relevant: true, sanitizedQuery: query });
        mockUpdateRepoLastAccessed.mockResolvedValueOnce(undefined);
        mockCreateEmbedding.mockResolvedValueOnce(embedding);
        mockCacheCheck.mockResolvedValueOnce(null);
        mockInterpretAndEmbedQuery.mockResolvedValueOnce({
            embedding,
            filters: { directory: 'src' },
            hypotheticalChunk: 'auth helper',
        });
        mockSearchChunks.mockResolvedValueOnce([chunk]);
        mockApplyPostRetrievalFilters.mockReturnValueOnce([chunk]);
        mockRerankChunks.mockResolvedValueOnce([chunk]);
        mockCompressContext.mockResolvedValueOnce([chunk]);
        mockBuildQuery.mockReturnValueOnce({
            systemPrompt: 'system prompt',
            userMessage: 'user message',
            contextStats,
        });
        mockProcessUserQuery.mockResolvedValueOnce({ content: 'final answer' });

        const result = await userQuery(query, repoURL, chatHistory);

        expect(result).toEqual({ message: 'final answer', contextStats });
        expect(mockUpdateRepoLastAccessed).toHaveBeenCalledWith(repoURL);
        expect(mockCreateEmbedding).toHaveBeenCalledWith(query);
        expect(mockCacheCheck).toHaveBeenCalledWith(repoURL, embedding);
        expect(mockInterpretAndEmbedQuery).toHaveBeenCalledWith(query);
        expect(mockSearchChunks).toHaveBeenCalledWith({
            embedding,
            repoURL,
            filters: { directory: 'src' },
            limit: 20,
            numCandidates: 200,
        });
        expect(mockCacheSave).toHaveBeenCalledWith(
            repoURL,
            query,
            embedding,
            'final answer',
            contextStats
        );
        expect(mockLoggerInfo).toHaveBeenCalled();
    });

    // This checks that clearly unrelated questions are stopped before any expensive work begins.
    it('blocks irrelevant queries before the pipeline runs', async () => {
        mockIsRelevant.mockResolvedValueOnce({ relevant: false, sanitizedQuery: 'ignored' });

        const result = await userQuery('How to build a rocket?', 'https://example.com/repo', []);

        expect(result).toEqual({
            message:
                "Sorry, your query doesn't seem to be related to the code repository. Please ask questions that are specific to the codebase or its features.",
            contextStats: null,
        });
        expect(mockUpdateRepoLastAccessed).not.toHaveBeenCalled();
        expect(mockCreateEmbedding).not.toHaveBeenCalled();
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'REPO: https://example.com/repo - Irrelevant query blocked: "How to build a rocket?"'
        );
    });

    // This checks that a cached answer is returned right away instead of running the full pipeline again.
    it('returns the cached response immediately when a matching semantic cache entry exists', async () => {
        const cachedContextStats = { chunkCount: 1, totalChars: 10, filesReferenced: [] };
        mockIsRelevant.mockResolvedValueOnce({ relevant: true, sanitizedQuery: 'cached question' });
        mockUpdateRepoLastAccessed.mockResolvedValueOnce(undefined);
        mockCreateEmbedding.mockResolvedValueOnce([0.5]);
        mockCacheCheck.mockResolvedValueOnce({
            response: 'cached answer',
            contextStats: cachedContextStats,
        });

        const result = await userQuery('cached question', 'https://example.com/repo', []);

        expect(result).toEqual({ message: 'cached answer', contextStats: cachedContextStats });
        expect(mockInterpretAndEmbedQuery).not.toHaveBeenCalled();
        expect(mockSearchChunks).not.toHaveBeenCalled();
        expect(mockCacheSave).not.toHaveBeenCalled();
    });

    // This checks that the controller gives a friendly fallback message when it cannot build an embedding.
    it('returns a fallback message when the embedding provider does not return an embedding', async () => {
        mockIsRelevant.mockResolvedValueOnce({
            relevant: true,
            sanitizedQuery: 'missing embedding',
        });
        mockUpdateRepoLastAccessed.mockResolvedValueOnce(undefined);
        mockCreateEmbedding.mockResolvedValueOnce(undefined);
        mockInterpretAndEmbedQuery.mockResolvedValueOnce(undefined);

        const result = await userQuery('missing embedding', 'https://example.com/repo', []);

        expect(result).toEqual({
            message: "Sorry, I couldn't understand your query. Please try rephrasing it.",
            contextStats: null,
        });
        expect(mockInterpretAndEmbedQuery).toHaveBeenCalledWith('missing embedding');
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'REPO: https://example.com/repo - Failed to create embedding for query: "missing embedding"'
        );
    });

    // This checks that the controller retries with a looser filter pass when the first pass removes everything.
    it('tries a second post-retrieval filter pass when the first pass removes every candidate chunk', async () => {
        const repoURL = 'https://example.com/repo';
        const query = 'Find the auth helper';
        const chunk = {
            metadata: { relativePath: 'src/auth.ts', startLine: 1, endLine: 5 },
            content: 'auth helper',
            score: 0.9,
        };

        mockIsRelevant.mockResolvedValueOnce({ relevant: true, sanitizedQuery: query });
        mockUpdateRepoLastAccessed.mockResolvedValueOnce(undefined);
        mockCreateEmbedding.mockResolvedValueOnce([0.1]);
        mockCacheCheck.mockResolvedValueOnce(null);
        mockInterpretAndEmbedQuery.mockResolvedValueOnce({
            embedding: [0.2],
            filters: { directory: 'src' },
            hypotheticalChunk: 'helper',
        });
        mockSearchChunks.mockResolvedValueOnce([chunk]);
        mockApplyPostRetrievalFilters.mockReturnValueOnce([]).mockReturnValueOnce([chunk]);
        mockRerankChunks.mockResolvedValueOnce([chunk]);
        mockCompressContext.mockResolvedValueOnce([chunk]);
        mockBuildQuery.mockReturnValueOnce({
            systemPrompt: 'system',
            userMessage: 'user',
            contextStats: { chunkCount: 1, totalChars: 12, filesReferenced: [] },
        });
        mockProcessUserQuery.mockResolvedValueOnce({ content: 'answer' });

        await userQuery(query, repoURL, []);

        expect(mockApplyPostRetrievalFilters).toHaveBeenCalledTimes(2);
        expect(mockApplyPostRetrievalFilters.mock.calls[1][2]).toMatchObject({
            scoreThreshold: 0.68,
        });
    });

    // This checks that the helper returns the repository URLs from the repository service.
    it('returns the repository names from the repository service', async () => {
        mockGetAllRepos.mockResolvedValueOnce([{ repoURL: 'one' }, { repoURL: 'two' }]);

        const repos = await getAllRepositories();

        expect(repos).toEqual(['one', 'two']);
    });

    // This checks that the helper returns the repository record when it exists and a friendly message when it does not.
    it('returns a repository record when one exists and a message when it does not', async () => {
        mockGetRepoByURL.mockResolvedValueOnce({ repoURL: 'https://example.com/repo' });

        await expect(getRepositoryByURL('https://example.com/repo')).resolves.toEqual({
            repoURL: 'https://example.com/repo',
        });

        mockGetRepoByURL.mockResolvedValueOnce(null);

        await expect(getRepositoryByURL('https://missing.example/repo')).resolves.toBe(
            'Repository with URL https://missing.example/repo not found.'
        );
    });
});

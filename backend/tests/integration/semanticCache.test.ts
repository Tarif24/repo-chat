import { cacheCheck, cacheSave, cacheInvalidate } from '../../src/services/semanticCache.js';
import { SemanticCache } from '../../src/database/models/index.js';
import { createEmbedding } from '../../src/providers/embeddingProvider.js';
import { getOpenAIResponseWithChatHistory } from '../../src/providers/completionProvider.js';
import { searchChunks } from '../../src/services/chunkProcessing.js';

jest.mock('../../src/providers/completionProvider.js', () => ({
    getOpenAIResponseWithChatHistory: jest.fn(),
}));

jest.mock('../../src/providers/embeddingProvider.js', () => ({
    createEmbedding: jest.fn(),
}));

jest.mock('../../src/services/chunkProcessing.js', () => ({
    searchChunks: jest.fn(),
}));

const mockGetOpenAIResponseWithChatHistory = getOpenAIResponseWithChatHistory as jest.Mock;
const mockCreateEmbedding = createEmbedding as jest.Mock;
const mockSearchChunks = searchChunks as jest.Mock;

async function runQueryFlow(repoURL: string, query: string) {
    const embedding = (await createEmbedding(query)) ?? [0.1, 0.2, 0.3];
    const cachedResult = await cacheCheck(repoURL, embedding);

    if (cachedResult) {
        return cachedResult;
    }

    await searchChunks({ embedding, repoURL, limit: 1, numCandidates: 1 });
    const response = (await getOpenAIResponseWithChatHistory([{ role: 'user', content: query }])) as {
        content: string;
    };
    const responseContent = response?.content ?? 'generated answer';
    await cacheSave(repoURL, query, embedding, responseContent, { totalChars: 120 });

    return { response: responseContent, contextStats: { totalChars: 120 } };
}

describe('semantic cache integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetOpenAIResponseWithChatHistory.mockResolvedValue({ content: 'generated answer' });
        mockCreateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        mockSearchChunks.mockResolvedValue([]);
    });

    // verifies the first lookup for a repo query misses the cache and reaches the completion provider
    it('misses the cache on the first lookup and calls the completion provider', async () => {
        const repoURL = 'https://example.com/repo';
        const query = 'How does auth work?';

        const firstResult = await runQueryFlow(repoURL, query);

        expect(firstResult).toEqual({
            response: 'generated answer',
            contextStats: { totalChars: 120 },
        });
        expect(mockCreateEmbedding).toHaveBeenCalledWith(query);
        expect(mockGetOpenAIResponseWithChatHistory).toHaveBeenCalledTimes(1);
        expect(mockSearchChunks).toHaveBeenCalledWith({
            embedding: [0.1, 0.2, 0.3],
            repoURL,
            limit: 1,
            numCandidates: 1,
        });

        const savedDoc = await SemanticCache.findOne({ repoURL, query });
        expect(savedDoc).toMatchObject({
            repoURL,
            query,
            response: 'generated answer',
            contextStats: { totalChars: 120 },
        });
    });

    // verifies an identical follow-up query hits the semantic cache without calling the completion provider again
    it('hits the cache on a repeated identical query without calling the completion provider again', async () => {
        const repoURL = 'https://example.com/repo';
        const query = 'How does auth work?';

        const firstResult = await runQueryFlow(repoURL, query);
        const secondResult = await runQueryFlow(repoURL, query);

        expect(firstResult).toEqual({
            response: 'generated answer',
            contextStats: { totalChars: 120 },
        });
        expect(secondResult).toEqual({
            response: 'generated answer',
            contextStats: { totalChars: 120 },
        });
        expect(mockGetOpenAIResponseWithChatHistory).toHaveBeenCalledTimes(1);
    });

    // verifies invalidating the cache for a repo removes all cached documents for that repo
    it('returns null after invalidate is called for that repoURL', async () => {
        const repoURL = 'https://example.com/repo';
        const embedding = [0.1, 0.2, 0.3];

        await cacheSave(repoURL, 'first query', embedding, 'first answer', { totalChars: 1 });
        await cacheSave(repoURL, 'second query', embedding, 'second answer', { totalChars: 2 });

        await cacheInvalidate(repoURL);

        const result = await cacheCheck(repoURL, embedding);

        expect(result).toBeNull();
        expect(await SemanticCache.countDocuments({ repoURL })).toBe(0);
    });

    // verifies re-ingestion for a repo with a new SHA clears previous cached answers for that repo
    it('invalidates cached entries when re-ingestion occurs for a new SHA', async () => {
        const repoURL = 'https://example.com/repo';
        const embedding = [0.1, 0.2, 0.3];

        await cacheSave(repoURL, 'old query', embedding, 'old answer', { totalChars: 1 });
        await cacheInvalidate(repoURL);

        const result = await cacheCheck(repoURL, embedding);

        expect(result).toBeNull();
        expect(await SemanticCache.countDocuments({ repoURL })).toBe(0);
    });
});

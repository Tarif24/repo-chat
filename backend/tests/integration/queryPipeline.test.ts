jest.mock('../../src/providers/completionProvider.js', () => ({
    checkQueryRelevance: jest.fn(),
    interpretQuery: jest.fn(),
    scoreChunks: jest.fn(),
    compressChunk: jest.fn(),
    getOpenAIResponseWithChatHistory: jest.fn(),
}));

jest.mock('../../src/providers/embeddingProvider.js', () => ({
    createEmbedding: jest.fn(),
}));

jest.mock('../../src/repositories/chunkRepository.js', () => ({
    vectorSearch: jest.fn(),
}));

import {
    checkQueryRelevance,
    interpretQuery,
    scoreChunks,
    getOpenAIResponseWithChatHistory,
} from '../../src/providers/completionProvider.js';
import { createEmbedding } from '../../src/providers/embeddingProvider.js';
import { vectorSearch } from '../../src/repositories/chunkRepository.js';
import { Repo, SemanticCache } from '../../src/database/models/index.js';
import { handleUserQuery } from '../../src/handlers/queryHandler.js';

const mockCheckQueryRelevance = checkQueryRelevance as jest.Mock;
const mockInterpretQuery = interpretQuery as jest.Mock;
const mockScoreChunks = scoreChunks as jest.Mock;
const mockGetOpenAIResponseWithChatHistory = getOpenAIResponseWithChatHistory as jest.Mock;
const mockCreateEmbedding = createEmbedding as jest.Mock;
const mockVectorSearch = vectorSearch as jest.Mock;

describe('query pipeline integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // This checks that a relevant question reaches the full retrieval path and returns both the answer and context stats.
    it('returns a generated answer and context stats for a relevant query', async () => {
        const repoURL = 'https://example.com/repo';
        const query = 'How does authentication work?';

        await Repo.create({ repoURL, latestSHA: 'abc123' });

        mockCheckQueryRelevance.mockResolvedValueOnce({ relevant: true, sanitizedQuery: query });
        mockCreateEmbedding
            .mockResolvedValueOnce([0.1, 0.2, 0.3])
            .mockResolvedValueOnce([0.4, 0.5, 0.6]);
        mockInterpretQuery.mockResolvedValueOnce({
            hypotheticalChunk: 'authentication middleware helper',
            filters: {},
        });
        mockVectorSearch.mockResolvedValueOnce([
            {
                content: 'auth helper implementation',
                score: 0.95,
                metadata: {
                    repoURL,
                    relativePath: 'src/auth.ts',
                    fileName: 'auth.ts',
                    name: 'authenticate',
                    type: 'function',
                    language: 'typescript',
                    parentDir: 'src',
                    startLine: 10,
                    endLine: 40,
                },
            },
        ]);
        mockScoreChunks.mockResolvedValueOnce([0.95]);
        mockGetOpenAIResponseWithChatHistory.mockResolvedValueOnce({ content: 'final answer' });

        const req = {
            body: {
                query,
                repoURL,
                chatHistory: [],
            },
        } as any;
        const fakeRes = {
            standardResponse: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
            setHeader: jest.fn(),
        } as any;

        await handleUserQuery(req, fakeRes);

        expect(fakeRes.standardResponse).toHaveBeenCalledWith(
            200,
            expect.objectContaining({
                message: 'final answer',
                contextStats: expect.objectContaining({
                    chunkCount: 1,
                    totalChars: expect.any(Number),
                    filesReferenced: expect.arrayContaining([
                        expect.objectContaining({ relativePath: 'src/auth.ts' }),
                    ]),
                }),
            }),
            'Query processed successfully'
        );
        expect(mockVectorSearch).toHaveBeenCalledWith({
            embedding: [0.4, 0.5, 0.6],
            repoURL,
            filters: {},
            limit: 20,
            numCandidates: 200,
        });

        const updatedRepo = await Repo.findOne({ repoURL });
        expect(updatedRepo?.lastAccessed).toBeInstanceOf(Date);

        const savedDoc = await SemanticCache.findOne({ repoURL, query });
        expect(savedDoc).toMatchObject({
            response: 'final answer',
            contextStats: expect.objectContaining({ chunkCount: 1 }),
        });
    });

    // This checks that unrelated questions stop before any retrieval work begins and return a rejection message.
    it('rejects irrelevant questions before retrieval runs', async () => {
        const repoURL = 'https://example.com/repo';
        const query = 'How do I build a rocket?';

        mockCheckQueryRelevance.mockResolvedValueOnce({
            relevant: false,
            sanitizedQuery: 'ignored',
        });

        const req = {
            body: {
                query,
                repoURL,
                chatHistory: [],
            },
        } as any;
        const fakeRes = {
            standardResponse: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
            setHeader: jest.fn(),
        } as any;

        await handleUserQuery(req, fakeRes);

        expect(fakeRes.standardResponse).toHaveBeenCalledWith(
            200,
            {
                message:
                    "Sorry, your query doesn't seem to be related to the code repository. Please ask questions that are specific to the codebase or its features.",
                contextStats: null,
            },
            'Query processed successfully'
        );
        expect(mockVectorSearch).not.toHaveBeenCalled();
        expect(mockCreateEmbedding).not.toHaveBeenCalled();
        expect(await SemanticCache.countDocuments({ repoURL })).toBe(0);
    });

    // This checks that an existing semantic cache entry short-circuits retrieval and generation for the same query.
    it('returns a cached answer without running retrieval or generation', async () => {
        const repoURL = 'https://example.com/repo';
        const query = 'cached question';

        await SemanticCache.create({
            repoURL,
            query,
            queryEmbedding: [0.7, 0.8, 0.9],
            response: 'cached answer',
            contextStats: { chunkCount: 1, totalChars: 10, filesReferenced: [] },
        });

        mockCheckQueryRelevance.mockResolvedValueOnce({ relevant: true, sanitizedQuery: query });
        mockCreateEmbedding.mockResolvedValueOnce([0.7, 0.8, 0.9]);

        const req = {
            body: {
                query,
                repoURL,
                chatHistory: [],
            },
        } as any;
        const fakeRes = {
            standardResponse: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
            setHeader: jest.fn(),
        } as any;

        await handleUserQuery(req, fakeRes);

        expect(fakeRes.standardResponse).toHaveBeenCalledWith(
            200,
            {
                message: 'cached answer',
                contextStats: { chunkCount: 1, totalChars: 10, filesReferenced: [] },
            },
            'Query processed successfully'
        );
        expect(mockVectorSearch).not.toHaveBeenCalled();
        expect(mockInterpretQuery).not.toHaveBeenCalled();
        expect(mockGetOpenAIResponseWithChatHistory).not.toHaveBeenCalled();
    });
});

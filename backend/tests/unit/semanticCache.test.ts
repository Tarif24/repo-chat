jest.mock('../../src/repositories/semanticCacheRepository.js', () => ({
    searchSemanticCache: jest.fn(),
    saveSemanticCache: jest.fn(),
    invalidateSemanticCache: jest.fn(),
}));

import {
    searchSemanticCache,
    saveSemanticCache,
    invalidateSemanticCache,
} from '../../src/repositories/semanticCacheRepository.js';
import {
    cacheCheck,
    cacheSave,
    cacheInvalidate,
} from '../../src/services/semanticCache.js';

const mockSearchSemanticCache = searchSemanticCache as jest.Mock;
const mockSaveSemanticCache = saveSemanticCache as jest.Mock;
const mockInvalidateSemanticCache = invalidateSemanticCache as jest.Mock;

describe('semanticCache service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when the cache lookup finds no matching entry', async () => {
        mockSearchSemanticCache.mockResolvedValueOnce(null);

        const result = await cacheCheck('https://example.com/repo', [0.1, 0.2, 0.3]);

        expect(result).toBeNull();
        expect(mockSearchSemanticCache).toHaveBeenCalledWith('https://example.com/repo', [0.1, 0.2, 0.3]);
    });

    it('returns null when the cached score is below the configured similarity threshold', async () => {
        mockSearchSemanticCache.mockResolvedValueOnce({
            response: 'cached answer',
            score: 0.8,
            contextStats: { tokenCount: 10 },
        });

        const result = await cacheCheck('https://example.com/repo', [0.1, 0.2, 0.3], 0.95);

        expect(result).toBeNull();
    });

    it('returns the cached response and context stats when the score meets the threshold', async () => {
        mockSearchSemanticCache.mockResolvedValueOnce({
            response: 'cached answer',
            score: 0.98,
            contextStats: { tokenCount: 10 },
        });

        const result = await cacheCheck('https://example.com/repo', [0.1, 0.2, 0.3], 0.95);

        expect(result).toEqual({
            response: 'cached answer',
            contextStats: { tokenCount: 10 },
        });
    });

    it('forwards the save arguments to the repository and resolves when the repository succeeds', async () => {
        mockSaveSemanticCache.mockResolvedValueOnce(undefined);

        await expect(
            cacheSave(
                'https://example.com/repo',
                'what does this do?',
                [0.4, 0.5, 0.6],
                'saved answer',
                { tokenCount: 12 }
            )
        ).resolves.toBeUndefined();

        expect(mockSaveSemanticCache).toHaveBeenCalledWith(
            'https://example.com/repo',
            'what does this do?',
            [0.4, 0.5, 0.6],
            'saved answer',
            { tokenCount: 12 }
        );
    });

    it('propagates an error from the repository when cache invalidation fails', async () => {
        mockInvalidateSemanticCache.mockRejectedValueOnce(new Error('delete failed'));

        await expect(cacheInvalidate('https://example.com/repo')).rejects.toThrow('delete failed');
        expect(mockInvalidateSemanticCache).toHaveBeenCalledWith('https://example.com/repo');
    });
});

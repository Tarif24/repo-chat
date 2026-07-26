// Mock the repository, cache, and logger modules so we can control storage, deletion, and logging behavior
jest.mock('../../src/repositories/databaseRepository.js', () => ({
    getDatabaseStorageStats: jest.fn(),
    compactDatabase: jest.fn(),
}));

jest.mock('../../src/repositories/chunkRepository.js', () => ({
    deleteChunksByRepoURL: jest.fn(),
}));

jest.mock('../../src/repositories/repoRepository.js', () => ({
    deleteRepoByURL: jest.fn(),
    getOldestRepo: jest.fn(),
}));

jest.mock('../../src/services/semanticCache.js', () => ({
    cacheInvalidate: jest.fn(),
}));

jest.mock('../../src/lib/logger.js', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

import {
    checkRepoBelowStorageLimit,
    canIngestRepo,
    databaseStorageStats,
    estimateRepoStorage,
} from '../../src/services/storage.js';

import {
    getDatabaseStorageStats,
    compactDatabase,
} from '../../src/repositories/databaseRepository.js';
import { deleteChunksByRepoURL } from '../../src/repositories/chunkRepository.js';
import { deleteRepoByURL, getOldestRepo } from '../../src/repositories/repoRepository.js';
import { cacheInvalidate } from '../../src/services/semanticCache.js';
import logger from '../../src/lib/logger.js';

const mockGetDatabaseStorageStats = getDatabaseStorageStats as jest.Mock;
const mockCompactDatabase = compactDatabase as jest.Mock;
const mockDeleteChunksByRepoURL = deleteChunksByRepoURL as jest.Mock;
const mockDeleteRepoByURL = deleteRepoByURL as jest.Mock;
const mockGetOldestRepo = getOldestRepo as jest.Mock;
const mockCacheInvalidate = cacheInvalidate as jest.Mock;
const mockLoggerWarn = logger.warn as jest.Mock;
const mockLoggerInfo = logger.info as jest.Mock;

describe('services/storage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // verifies estimateRepoStorage computes chunk and byte estimates correctly
    it('calculates estimated chunks and storage totals', () => {
        const estimate = estimateRepoStorage(2_200);

        expect(estimate).toEqual({
            estimatedChunks: 2,
            confirmedTotalBytes: 49_600,
            fullTotalBytes: 79_600,
            confirmedTotalMB: 49_600 / 1_048_576,
            fullTotalMB: 79_600 / 1_048_576,
        });
    });

    // ensures checkRepoBelowStorageLimit allows storage when buffer is within the limit
    it('returns allowed true when storage is below limit without safe buffer', () => {
        const result = checkRepoBelowStorageLimit(2_200, 100, true, false);

        expect(result.allowed).toBe(true);
        expect(result.bufferMB).toBe(0);
        expect(result.reason).toBeUndefined();
        expect(result.estimate.fullTotalMB).toBeGreaterThan(result.estimate.confirmedTotalMB);
    });

    // ensures checkRepoBelowStorageLimit rejects storage when safe storage estimate exceeds the limit
    it('returns allowed false when safe buffer exceeds the given limit', () => {
        const result = checkRepoBelowStorageLimit(2_200, 0.01, true, true);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Estimated storage');
        expect(result.reason).toContain('exceeds limit of 0.01 MB');
        expect(result.bufferMB).toBeGreaterThan(0);
    });

    // verifies canIngestRepo returns allowed true when projected usage is under the critical threshold
    it('returns allowed true when projected usage is below critical threshold', async () => {
        mockGetDatabaseStorageStats.mockResolvedValueOnce({
            totalOnDiskSize: 90,
            availableBytes: 10,
            availableMB: 0.0095,
            usedMB: 90,
            usedPct: 90,
            limitMB: 100,
            liveUsedMB: 90,
        });

        const result = await canIngestRepo(5, 95);

        expect(mockGetDatabaseStorageStats).toHaveBeenCalledTimes(1);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.databaseStats.liveUsedMB).toBe(90);
        expect(mockLoggerWarn).not.toHaveBeenCalled();
    });

    // verifies canIngestRepo deletes oldest repos until the projected usage falls below the critical threshold
    it('deletes oldest repositories and compacts database when usage is critically high', async () => {
        mockGetDatabaseStorageStats
            .mockResolvedValueOnce({
                totalOnDiskSize: 90,
                availableBytes: 10,
                availableMB: 0.0095,
                usedMB: 90,
                usedPct: 90,
                limitMB: 100,
                liveUsedMB: 90,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 96,
                availableBytes: 4,
                availableMB: 0.0038,
                usedMB: 96,
                usedPct: 96,
                limitMB: 100,
                liveUsedMB: 96,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 74,
                availableBytes: 26,
                availableMB: 0.0248,
                usedMB: 74,
                usedPct: 74,
                limitMB: 100,
                liveUsedMB: 74,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 74,
                availableBytes: 26,
                availableMB: 0.0248,
                usedMB: 74,
                usedPct: 74,
                limitMB: 100,
                liveUsedMB: 74,
            });

        mockGetOldestRepo
            .mockResolvedValueOnce({ repoURL: 'https://example.com/repo1' })
            .mockResolvedValueOnce({ repoURL: 'https://example.com/repo2' });
        mockDeleteChunksByRepoURL.mockResolvedValueOnce({ deletedCount: 1 });
        mockDeleteRepoByURL.mockResolvedValueOnce({ deletedCount: 1 });
        mockCacheInvalidate.mockResolvedValueOnce(undefined);
        mockDeleteChunksByRepoURL.mockResolvedValueOnce({ deletedCount: 1 });
        mockDeleteRepoByURL.mockResolvedValueOnce({ deletedCount: 1 });
        mockCacheInvalidate.mockResolvedValueOnce(undefined);
        mockCompactDatabase.mockResolvedValueOnce(undefined);

        const result = await canIngestRepo(20, 95);

        expect(mockGetDatabaseStorageStats).toHaveBeenCalledTimes(4);
        expect(mockGetOldestRepo).toHaveBeenCalledTimes(2);
        expect(mockDeleteChunksByRepoURL).toHaveBeenCalledTimes(2);
        expect(mockDeleteRepoByURL).toHaveBeenCalledTimes(2);
        expect(mockCacheInvalidate).toHaveBeenCalledTimes(2);
        expect(mockCompactDatabase).toHaveBeenCalledTimes(1);
        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('Deleted 2 oldest repositories');
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'Deleted 2 oldest repositories to free up space for new ingestion.'
        );
    });

    // verifies canIngestRepo returns allowed false when no repos remain to delete and usage is still critical
    it('returns allowed false when repository deletion cannot free enough space', async () => {
        const stats = {
            totalOnDiskSize: 90,
            availableBytes: 10,
            availableMB: 0.0095,
            usedMB: 90,
            usedPct: 90,
            limitMB: 100,
            liveUsedMB: 90,
        };

        mockGetDatabaseStorageStats.mockResolvedValueOnce(stats);
        mockGetOldestRepo.mockResolvedValueOnce(null);

        const result = await canIngestRepo(11, 95);

        expect(mockGetDatabaseStorageStats).toHaveBeenCalledTimes(1);
        expect(mockGetOldestRepo).toHaveBeenCalledTimes(1);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe(
            'Database is critically full and no repositories could be removed to free space.'
        );
        expect(result.databaseStats).toEqual(stats);
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'No repositories left to delete but storage is still critically full.'
        );
    });

    // ensures databaseStorageStats returns only the selected stats fields
    it('returns mapped database stats fields from getDatabaseStorageStats', async () => {
        mockGetDatabaseStorageStats.mockResolvedValueOnce({
            totalOnDiskSize: 80,
            availableBytes: 20,
            availableMB: 0.0191,
            usedMB: 80,
            usedPct: 80,
            limitMB: 100,
            liveUsedMB: 80,
        });

        const result = await databaseStorageStats();

        expect(result).toEqual({
            usedMB: 80,
            limitMB: 100,
            usedPct: 80,
        });
    });
});

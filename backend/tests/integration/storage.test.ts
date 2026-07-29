import Repo from '../../src/database/models/Repo.js';
import { compactDatabase, getDatabaseStorageStats } from '../../src/repositories/databaseRepository.js';
import { invalidateSemanticCache } from '../../src/repositories/semanticCacheRepository.js';
import { canIngestRepo } from '../../src/services/storage.js';

jest.mock('../../src/repositories/databaseRepository.js', () => ({
    getDatabaseStorageStats: jest.fn(),
    compactDatabase: jest.fn(),
}));

jest.mock('../../src/repositories/semanticCacheRepository.js', () => ({
    invalidateSemanticCache: jest.fn(),
}));

const mockGetDatabaseStorageStats = getDatabaseStorageStats as jest.Mock;
const mockCompactDatabase = compactDatabase as jest.Mock;
const mockInvalidateSemanticCache = invalidateSemanticCache as jest.Mock;

describe('storage service integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // verifies canIngestRepo deletes the oldest real repo when storage is critically full
    it('deletes the oldest real repo when storage is over the critical threshold', async () => {
        await Repo.create([
            {
                repoURL: 'https://example.com/oldest',
                latestSHA: 'oldest-sha',
                lastAccessed: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
                repoURL: 'https://example.com/newest',
                latestSHA: 'newest-sha',
                lastAccessed: new Date('2024-01-02T00:00:00.000Z'),
            },
        ]);

        mockGetDatabaseStorageStats
            .mockResolvedValueOnce({
                totalOnDiskSize: 100,
                availableBytes: 0,
                availableMB: 0,
                usedMB: 90,
                usedPct: 90,
                limitMB: 100,
                liveUsedMB: 90,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 80,
                availableBytes: 20,
                availableMB: 0.0191,
                usedMB: 80,
                usedPct: 80,
                limitMB: 100,
                liveUsedMB: 80,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 80,
                availableBytes: 20,
                availableMB: 0.0191,
                usedMB: 80,
                usedPct: 80,
                limitMB: 100,
                liveUsedMB: 80,
            });

        mockCompactDatabase.mockResolvedValueOnce(undefined);
        mockInvalidateSemanticCache.mockResolvedValueOnce(undefined);

        const result = await canIngestRepo(10, 95);

        const oldestRepo = await Repo.findOne({ repoURL: 'https://example.com/oldest' });
        const newestRepo = await Repo.findOne({ repoURL: 'https://example.com/newest' });

        expect(result.allowed).toBe(true);
        expect(oldestRepo).toBeNull();
        expect(newestRepo).not.toBeNull();
        expect(mockInvalidateSemanticCache).toHaveBeenCalledTimes(1);
        expect(mockInvalidateSemanticCache).toHaveBeenCalledWith('https://example.com/oldest');
        expect(mockCompactDatabase).toHaveBeenCalledTimes(1);
    });

    // verifies canIngestRepo invalidates the semantic cache for each deleted repo
    it('invalidates the semantic cache for each deleted repo while freeing space', async () => {
        await Repo.create([
            {
                repoURL: 'https://example.com/first',
                latestSHA: 'first-sha',
                lastAccessed: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
                repoURL: 'https://example.com/second',
                latestSHA: 'second-sha',
                lastAccessed: new Date('2024-01-02T00:00:00.000Z'),
            },
            {
                repoURL: 'https://example.com/third',
                latestSHA: 'third-sha',
                lastAccessed: new Date('2024-01-03T00:00:00.000Z'),
            },
        ]);

        mockGetDatabaseStorageStats
            .mockResolvedValueOnce({
                totalOnDiskSize: 110,
                availableBytes: 0,
                availableMB: 0,
                usedMB: 105,
                usedPct: 105,
                limitMB: 100,
                liveUsedMB: 105,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 95,
                availableBytes: 5,
                availableMB: 0.0048,
                usedMB: 95,
                usedPct: 95,
                limitMB: 100,
                liveUsedMB: 95,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 85,
                availableBytes: 15,
                availableMB: 0.0143,
                usedMB: 85,
                usedPct: 85,
                limitMB: 100,
                liveUsedMB: 85,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 85,
                availableBytes: 15,
                availableMB: 0.0143,
                usedMB: 85,
                usedPct: 85,
                limitMB: 100,
                liveUsedMB: 85,
            });

        mockCompactDatabase.mockResolvedValueOnce(undefined);
        mockInvalidateSemanticCache.mockResolvedValue(undefined);

        const result = await canIngestRepo(10, 95);

        expect(result.allowed).toBe(true);
        expect(mockInvalidateSemanticCache).toHaveBeenCalledTimes(2);
        expect(mockInvalidateSemanticCache).toHaveBeenNthCalledWith(1, 'https://example.com/first');
        expect(mockInvalidateSemanticCache).toHaveBeenNthCalledWith(2, 'https://example.com/second');
        expect(await Repo.findOne({ repoURL: 'https://example.com/first' })).toBeNull();
        expect(await Repo.findOne({ repoURL: 'https://example.com/second' })).toBeNull();
        expect(await Repo.findOne({ repoURL: 'https://example.com/third' })).not.toBeNull();
    });

    // verifies canIngestRepo returns not allowed when no repos exist and storage is still critical
    it('returns not allowed when the database is empty and storage is still critical', async () => {
        mockGetDatabaseStorageStats.mockResolvedValueOnce({
            totalOnDiskSize: 110,
            availableBytes: 0,
            availableMB: 0,
            usedMB: 105,
            usedPct: 105,
            limitMB: 100,
            liveUsedMB: 105,
        });

        const result = await canIngestRepo(10, 95);

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe(
            'Database is critically full and no repositories could be removed to free space.'
        );
        expect(mockCompactDatabase).not.toHaveBeenCalled();
        expect(mockInvalidateSemanticCache).not.toHaveBeenCalled();
    });

    // verifies compactDatabase is only called once after the deletion loop completes
    it('calls compactDatabase once after the deletion loop finishes', async () => {
        await Repo.create([
            {
                repoURL: 'https://example.com/one',
                latestSHA: 'one-sha',
                lastAccessed: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
                repoURL: 'https://example.com/two',
                latestSHA: 'two-sha',
                lastAccessed: new Date('2024-01-02T00:00:00.000Z'),
            },
            {
                repoURL: 'https://example.com/three',
                latestSHA: 'three-sha',
                lastAccessed: new Date('2024-01-03T00:00:00.000Z'),
            },
        ]);

        mockGetDatabaseStorageStats
            .mockResolvedValueOnce({
                totalOnDiskSize: 120,
                availableBytes: 0,
                availableMB: 0,
                usedMB: 105,
                usedPct: 105,
                limitMB: 100,
                liveUsedMB: 105,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 95,
                availableBytes: 5,
                availableMB: 0.0048,
                usedMB: 95,
                usedPct: 95,
                limitMB: 100,
                liveUsedMB: 95,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 85,
                availableBytes: 15,
                availableMB: 0.0143,
                usedMB: 85,
                usedPct: 85,
                limitMB: 100,
                liveUsedMB: 85,
            })
            .mockResolvedValueOnce({
                totalOnDiskSize: 85,
                availableBytes: 15,
                availableMB: 0.0143,
                usedMB: 85,
                usedPct: 85,
                limitMB: 100,
                liveUsedMB: 85,
            });

        mockCompactDatabase.mockResolvedValueOnce(undefined);
        mockInvalidateSemanticCache.mockImplementation(async () => {
            expect(mockCompactDatabase).not.toHaveBeenCalled();
            return undefined;
        });

        await canIngestRepo(10, 95);

        expect(mockCompactDatabase).toHaveBeenCalledTimes(1);
    });
});

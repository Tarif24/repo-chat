import type { DatabaseStorageStats } from '../repositories/databaseRepository.js';
import { getDatabaseStorageStats, compactDatabase } from '../repositories/databaseRepository.js';
import { deleteChunksByRepoURL } from '../repositories/chunkRepository.js';
import { deleteRepoByURL, getOldestRepo } from '../repositories/repoRepository.js';
import logger from '../lib/logger.js';
import { cacheInvalidate } from './semanticCache.js';

type StorageEstimate = {
    estimatedChunks: number;
    confirmedTotalBytes: number;
    fullTotalBytes: number; // confirmedTotal + vectorIndex
    confirmedTotalMB: number;
    fullTotalMB: number;
};

export function estimateRepoStorage(totalBytes: number): StorageEstimate {
    // Chunk count — empirically validated at 1,100 bytes per chunk
    const estimatedChunks = Math.ceil(totalBytes / 1_100);

    // Document storage — empirically validated at ~22,000 bytes per chunk
    const BYTES_PER_DOCUMENT = 22_000;
    const documentStorageBytes = estimatedChunks * BYTES_PER_DOCUMENT;

    // _id index — observed at ~2,800 bytes per chunk
    const BYTES_PER_ID_INDEX = 2_800;
    const idIndexBytes = estimatedChunks * BYTES_PER_ID_INDEX;

    // Vector search index — theoretical, unconfirmed at scale
    const BYTES_PER_VECTOR_INDEX = 15_000;
    const vectorIndexBytes = estimatedChunks * BYTES_PER_VECTOR_INDEX;

    const confirmedTotalBytes = documentStorageBytes + idIndexBytes;
    const fullTotalBytes = confirmedTotalBytes + vectorIndexBytes;

    return {
        estimatedChunks,
        confirmedTotalBytes,
        fullTotalBytes,
        confirmedTotalMB: confirmedTotalBytes / 1_048_576,
        fullTotalMB: fullTotalBytes / 1_048_576,
    };
}

// Enforce a storage cap before ingestion
export function checkRepoBelowStorageLimit(
    totalBytes: number,
    limitMB: number,
    includeVectorIndex = false,
    safeStorageEstimate = false
): { allowed: boolean; estimate: StorageEstimate; bufferMB: number; reason?: string } {
    const estimate = estimateRepoStorage(totalBytes);

    const projectedMB = includeVectorIndex ? estimate.fullTotalMB : estimate.confirmedTotalMB;

    const bufferMB = safeStorageEstimate ? projectedMB * 1.15 : 0; // Add 15% buffer if enabled

    if (bufferMB > limitMB) {
        return {
            allowed: false,
            estimate,
            bufferMB,
            reason: `Estimated storage ${bufferMB.toFixed(1)} MB exceeds limit of ${limitMB} MB`,
        };
    }

    return { allowed: true, estimate, bufferMB: bufferMB };
}

export async function canIngestRepo(
    sizeMB: number,
    criticalPct: number
): Promise<{
    allowed: boolean;
    reason?: string;
    databaseStats: DatabaseStorageStats;
}> {
    let databaseStats = await getDatabaseStorageStats();

    let projectedUsedPct = ((databaseStats.liveUsedMB + sizeMB) / databaseStats.limitMB) * 100;

    // If the projected usage exceeds the critical threshold, delete oldest repositories until it's below the threshold
    if (projectedUsedPct > criticalPct) {
        let deletedRepos = 0;

        while (projectedUsedPct > criticalPct) {
            const oldestRepo = await getOldestRepo();

            if (!oldestRepo) {
                logger.warn('No repositories left to delete but storage is still critically full.');
                return {
                    allowed: false,
                    reason: 'Database is critically full and no repositories could be removed to free space.',
                    databaseStats,
                };
            }

            await deleteChunksByRepoURL(oldestRepo.repoURL);
            await deleteRepoByURL(oldestRepo.repoURL);
            await cacheInvalidate(oldestRepo.repoURL);

            databaseStats = await getDatabaseStorageStats();
            projectedUsedPct = ((databaseStats.liveUsedMB + sizeMB) / databaseStats.limitMB) * 100;
            deletedRepos++;
        }

        // Compact once — now storageSize catches up, final stats are accurate
        await compactDatabase();
        databaseStats = await getDatabaseStorageStats();

        logger.info(
            'Deleted ' + deletedRepos + ' oldest repositories to free up space for new ingestion.'
        );

        return {
            allowed: true,
            reason: `Projected database usage exceeds critical threshold of ${criticalPct}%. Deleted ${deletedRepos} oldest repositories to free up space.`,
            databaseStats,
        };
    }

    return { allowed: true, databaseStats };
}

export async function databaseStorageStats() {
    const databaseStats = await getDatabaseStorageStats();

    return {
        usedMB: databaseStats.usedMB,
        limitMB: databaseStats.limitMB,
        usedPct: databaseStats.usedPct,
    };
}

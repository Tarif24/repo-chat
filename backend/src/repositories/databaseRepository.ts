import mongoose from 'mongoose';
import { ConnectionError } from '../error/appError.js';

export type DatabaseStorageStats = {
    totalOnDiskSize: number; // storageSize + indexSize — what Atlas counts against the limit
    availableBytes: number;
    availableMB: number;
    usedMB: number;
    usedPct: number;
    limitMB: number;
    liveUsedMB: number; // dataSize + indexSize — what we use to track loop termination after deletions
};

const FREE_TIER_LIMIT_BYTES = 512 * 1_048_576; // 512 MB in bytes

export async function getDatabaseStorageStats(): Promise<DatabaseStorageStats> {
    const db = mongoose.connection.db;

    if (!db) throw new ConnectionError('No active MongoDB connection');

    const stats = (await db.command({ dbStats: 1, scale: 1 })) as {
        dataSize: number;
        storageSize: number;
        indexSize: number;
        totalSize: number;
    };

    const totalOnDiskSize = stats.storageSize + stats.indexSize;
    const availableBytes = Math.max(0, FREE_TIER_LIMIT_BYTES - totalOnDiskSize);

    return {
        totalOnDiskSize,
        availableBytes,
        availableMB: availableBytes / 1_048_576,
        usedMB: totalOnDiskSize / 1_048_576,
        usedPct: (totalOnDiskSize / FREE_TIER_LIMIT_BYTES) * 100,
        limitMB: FREE_TIER_LIMIT_BYTES / 1_048_576,
        // Separate field for loop termination — updates immediately after deletions
        liveUsedMB: (stats.dataSize + stats.indexSize) / 1_048_576,
    };
}

export function compactDatabase() {
    const db = mongoose.connection.db;

    if (!db) throw new ConnectionError('No active MongoDB connection');
    return db.command({ compact: 'chunks' });
}

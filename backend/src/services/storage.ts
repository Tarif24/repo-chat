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

// Optional: enforce a storage cap before ingestion
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

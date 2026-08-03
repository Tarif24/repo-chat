import logger from '../lib/logger.js';
import { ingestRepo } from '../services/ingest.js';
import { deleteRepoAndChunks } from '../services/repoProcessing.js';
import { cacheInvalidate } from '../services/semanticCache.js';
import {
    getRepoIngestStatus,
    deleteRepoIngestStatus,
    createRepoIngestStatus,
} from '../services/ingestProgress.js';

export async function ingest(repoURL: string) {
    await createRepoIngestStatus(repoURL);

    await ingestRepo(repoURL).catch(err => {
        logger.error(`REPO: ${repoURL} - Unhandled ingestion error: ${err.message}`);
    });
}

export async function getIngestStatus(repoURL: string) {
    const status = await getRepoIngestStatus(repoURL);

    if (status?.status === 'complete' || status?.status === 'error') {
        void deleteRepoIngestStatus(repoURL);
    }

    return status;
}

export async function repoCleanup(repoURL: string) {
    await cacheInvalidate(repoURL);
    await deleteRepoIngestStatus(repoURL);
    await deleteRepoAndChunks(repoURL);
}

import logger from '../lib/logger.js';
import { ingestRepo } from '../services/ingest.js';
import {
    getRepoIngestStatus,
    deleteRepoIngestStatus,
    createRepoIngestStatus,
} from '../services/ingestProgress.js';

export async function ingest(repoURL: string) {
    await createRepoIngestStatus(repoURL);

    ingestRepo(repoURL).catch(err => {
        logger.error(`REPO: ${repoURL} - Unhandled ingestion error: ${err.message}`);
    });
}

export async function getIngestStatus(repoURL: string) {
    const status = await getRepoIngestStatus(repoURL);

    if (status?.status === 'complete' || status?.status === 'error') {
        await deleteRepoIngestStatus(repoURL);
    }

    return status;
}

import logger from '../lib/logger.js';
import { ingestRepo } from '../services/ingest.js';
import { getRepoIngestStatus } from '../services/ingestProgress.js';

export function ingest(repoURL: string) {
    ingestRepo(repoURL).catch(err => {
        logger.error(`REPO: ${repoURL} - Unhandled ingestion error: ${err.message}`);
    });
}

export async function getIngestStatus(repoURL: string) {
    const status = await getRepoIngestStatus(repoURL);

    return status;
}

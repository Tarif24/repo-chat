import logger from '../lib/logger.js';
import { ingestRepo } from '../services/ingest.js';

export function ingest(jobId: string, repoUrl: string): void {
    ingestRepo(repoUrl).catch(err => {
        logger.error(`Unhandled ingestion error for job ${jobId}: ${err.message}`);
    });
}

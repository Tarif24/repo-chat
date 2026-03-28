import logger from '../lib/logger.js';
import { cloneAndGetSha } from '../services/gitHub.js';

export async function ingestRepo(
    repoUrl: string
): Promise<{ success: boolean; latestSha?: string; message: string }> {
    logger.info(`Starting ingestion for repository: ${repoUrl}`);

    const repoSha = await cloneAndGetSha(repoUrl);

    if (!repoSha) {
        return { success: false, message: 'Failed to retrieve latest SHA' };
    }
    return { success: true, latestSha: repoSha, message: 'Repository ingested successfully' };
}

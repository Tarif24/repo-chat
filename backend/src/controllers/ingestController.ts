import logger from '../lib/logger.js';
import { cloneAndGetSha } from '../services/gitHub.js';
import { collectParseableFiles } from '../services/files.js';
import { parseFiles } from '../services/treeSitter.js';

export async function ingestRepo(
    repoUrl: string
): Promise<{ success: boolean; latestSha?: string; message: string }> {
    logger.info(`REPO: ${repoUrl} - Starting ingestion process.`);

    // Clone the repository and get the latest SHA
    const repoSha = await cloneAndGetSha(repoUrl);

    if (!repoSha) {
        return { success: false, message: 'Failed to ingest repository' };
    }

    // Scan the cloned repository for parseable files
    const validFiles = await collectParseableFiles(`./repoCloning`, repoUrl);

    // Parse the valid files using Tree-sitter
    parseFiles(validFiles || [], repoUrl);

    return { success: true, latestSha: repoSha, message: 'Repository ingested successfully' };
}

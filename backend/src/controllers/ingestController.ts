import logger from '../lib/logger.js';
import { appConfig } from '../config/config.js';
import { cloneAndGetSha, getLatestSha } from '../services/gitHub.js';
import {
    collectParseableFiles,
    createParseableFilesTree,
    deleteEverythingInDir,
} from '../services/files.js';
import { parseFiles } from '../services/treeSitter.js';
import { processAndStoreChunks } from '../services/chunkProcessing.js';
import {
    initializeNewRepo,
    getRepoByURL,
    updateRepo,
    updateRepoFileTree,
} from '../services/repoProcessing.js';

export async function ingestRepo(
    repoUrl: string
): Promise<{ success: boolean; latestSha?: string; message: string }> {
    logger.info(`REPO: ${repoUrl} - Starting ingestion process.`);

    const existingRepo = await getRepoByURL(repoUrl);
    const latestSha = await getLatestSha(repoUrl);

    // If the repository already exists and the latest SHA matches, skip re-ingestion
    if (existingRepo && latestSha && existingRepo.latestSHA === latestSha) {
        logger.info(`REPO: ${repoUrl} - Repository is up to date. No need to re-ingest.`);
        return { success: true, latestSha, message: 'Repository is up to date' };
    }

    // Clone the repository and get the latest SHA
    const repoSha = await cloneAndGetSha(repoUrl, appConfig.repoStoragePath);

    if (!repoSha) {
        return { success: false, message: 'Failed to clone repository' };
    }

    // If the repository already exists but the latest SHA is different, update the repo record
    if (existingRepo) {
        await updateRepo(repoUrl, repoSha);
        // If the repository does not exist, create a new repo record
    } else {
        await initializeNewRepo(repoUrl, repoSha);
    }

    // Scan the cloned repository for parseable files
    const validFiles = await collectParseableFiles(appConfig.repoStoragePath, repoUrl);

    // Create and store the file tree structure in the database
    const fileTree = createParseableFilesTree(appConfig.repoStoragePath);
    if (fileTree) {
        await updateRepoFileTree(repoUrl, fileTree);
    }

    // Clear the cloned repository from disk to save space
    deleteEverythingInDir(appConfig.repoStoragePath);

    // Parse the valid files using Tree-sitter
    const allCodeChunks = await parseFiles(validFiles || [], repoUrl);

    // Process and store the code chunks in the database
    await processAndStoreChunks(allCodeChunks, repoUrl);

    return { success: true, latestSha: repoSha, message: 'Repository ingested successfully' };
}

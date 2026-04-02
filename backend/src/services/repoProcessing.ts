import { deleteChunksByRepoURL } from '../repositories/chunkRepository.js';
import {
    findRepoByURL,
    createRepo,
    updateLastAccessed,
    updateLatestSHA,
    updateFileTree,
} from '../repositories/repoRepository.js';
import logger from '../lib/logger.js';

export async function initializeNewRepo(repoURL: string, latestSHA: string) {
    const existingRepo = await findRepoByURL(repoURL);
    if (existingRepo) {
        await updateLatestSHA(repoURL, latestSHA);
        await updateLastAccessed(repoURL);
        logger.info(
            `REPO: ${repoURL} - Repository already exists. Updated latest SHA and last accessed time.`
        );
        return await findRepoByURL(repoURL);
    }

    logger.info(`REPO: ${repoURL} - Initialized new repository.`);
    return await createRepo({ repoURL, latestSHA });
}

export async function updateRepo(repoURL: string, latestSHA: string) {
    await updateLatestSHA(repoURL, latestSHA);
    await updateLastAccessed(repoURL);
    await deleteChunksByRepoURL(repoURL);

    logger.info(
        `REPO: ${repoURL} - Updated repository with new latest SHA and reset last accessed time.`
    );
}

export async function updateRepoLatestSHA(repoURL: string, latestSHA: string) {
    return await updateLatestSHA(repoURL, latestSHA);
}

export async function updateRepoLastAccessed(repoURL: string) {
    return await updateLastAccessed(repoURL);
}

export async function getRepoByURL(repoURL: string) {
    return await findRepoByURL(repoURL);
}

export async function updateRepoFileTree(repoURL: string, fileTree: object) {
    return await updateFileTree(repoURL, fileTree);
}

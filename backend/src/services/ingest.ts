import logger from '../lib/logger.js';
import { appConfig } from '../config/config.js';
import { cloneAndGetSha, getLatestSha } from '../services/gitHub.js';
import {
    initializeDirectory,
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
    updateRepoLastAccessed,
} from '../services/repoProcessing.js';
import { checkRepoBelowStorageLimit, canIngestRepo } from '../services/storage.js';
import { cacheInvalidate } from '../services/semanticCache.js';

import { getJob } from '../lib/jobRegistry.js';

export async function ingestRepo(jobId: string, repoUrl: string): Promise<void> {
    const emit = (event: string, data: object) => {
        const sender = getJob(jobId);
        if (sender) {sender(event, data);}
    };

    try {
        logger.info(`REPO: ${repoUrl} - Starting ingestion process.`);

        initializeDirectory();

        const existingRepo = await getRepoByURL(repoUrl);
        const latestSha = await getLatestSha(repoUrl);

        // If the repository already exists and the latest SHA matches, skip re-ingestion but update the last accessed time
        if (existingRepo && latestSha && existingRepo.latestSHA === latestSha) {
            await updateRepoLastAccessed(repoUrl);
            emit('complete', {
                message: 'Repository is up to date. No need to re-ingest',
                latestSha,
                success: true,
            });
            return;
        }

        // --- cloning stage ---

        // Clone the repository and get the latest SHA
        emit('cloning', { message: 'Cloning repository...' });
        const repoSha = await cloneAndGetSha(repoUrl, appConfig.repoStoragePath);

        if (!repoSha) {
            emit('error', { message: 'Failed to clone repository', success: false });
            return;
        }

        // Invalidate cache for the repository if it already exists but has new commits
        if (existingRepo) {
            await cacheInvalidate(repoUrl);
        }

        // --- scanning stage ---

        // Scan the cloned repository for parseable files
        const { validFiles, validFilesSize } = collectParseableFiles(
            appConfig.repoStoragePath,
            repoUrl
        );
        emit('scanning', { message: 'Scanning files...', fileCount: validFiles?.length ?? 0 });

        // Estimate the storage requirements for the repository and check against limits
        const storageCheck = checkRepoBelowStorageLimit(validFilesSize, 25, false, true);

        logger.info(
            `REPO: ${repoUrl} - Storage estimate for repository: ${storageCheck.estimate.confirmedTotalMB.toFixed(
                2
            )} MB.`
        );

        logger.info(
            `REPO: ${repoUrl} - Storage estimate for repository with buffer: ${storageCheck.bufferMB.toFixed(
                2
            )} MB.`
        );

        emit('storageCheck', {
            message: 'Checking storage limits...',
            estimateMB: storageCheck.estimate.confirmedTotalMB.toFixed(2),
            estimateWithBufferMB: storageCheck.bufferMB.toFixed(2),
        });

        // If the repository exceeds the storage limit, abort ingestion and clean up the cloned files
        if (!storageCheck.allowed) {
            logger.warn(
                `REPO: ${repoUrl} - Repository exceeds storage limit. Ingestion aborted. Reason: ${storageCheck.reason}`
            );

            // Clear the cloned repository from disk to save space
            await deleteEverythingInDir(appConfig.repoStoragePath);
            emit('error', {
                message: `Repository exceeds storage limit. ${storageCheck.reason}`,
                success: false,
            });
            return;
        }

        // Check if the repository can be ingested based on current database storage stats
        const dbStorageCheck = await canIngestRepo(storageCheck.bufferMB, 90);

        logger.info(
            `REPO: ${repoUrl} - Database storage check for repository ingestion: used: ${dbStorageCheck.databaseStats.usedMB.toFixed(2)}/${dbStorageCheck.databaseStats.limitMB.toFixed(
                2
            )} MB. Used percentage: ${dbStorageCheck.databaseStats.usedPct.toFixed(2)}%.`
        );

        // If the database does not have enough storage to ingest the repository, abort and clean up the cloned files
        if (!dbStorageCheck.allowed) {
            logger.warn(
                `REPO: ${repoUrl} - Not enough database storage to ingest repository. Ingestion aborted. Reason: ${dbStorageCheck.reason}`
            );

            // Clear the cloned repository from disk to save space
            await deleteEverythingInDir(appConfig.repoStoragePath);
            emit('error', {
                success: false,
                message: `Repository exceeds database storage limit. ${dbStorageCheck.reason}`,
            });
            return;
        }

        // If the repository already exists but the latest SHA is different, update the repo record
        if (existingRepo) {
            await updateRepo(repoUrl, repoSha);
            // If the repository does not exist, create a new repo record
        } else {
            await initializeNewRepo(repoUrl, repoSha);
        }

        // Create and store the file tree structure in the database
        const fileTree = createParseableFilesTree(appConfig.repoStoragePath);
        if (fileTree) {
            await updateRepoFileTree(repoUrl, fileTree);
        }

        // --- chunking stage ---

        // Parse the valid files using Tree-sitter
        const allCodeChunks = await parseFiles(validFiles || [], repoUrl);
        emit('chunking', { message: 'Chunking files...', chunkCount: allCodeChunks.length });

        // Clear the cloned repository from disk to save space
        await deleteEverythingInDir(appConfig.repoStoragePath);

        // --- embedding + storing stage ---

        // Process and store the code chunks in the database
        await processAndStoreChunks(allCodeChunks, repoUrl, emit);

        // --- complete ---
        emit('complete', {
            message: 'Repository ingested successfully',
            latestSha: repoSha,
            chunkCount: allCodeChunks.length,
            success: true,
        });
    } catch (err: any) {
        logger.error(`REPO: ${repoUrl} - Ingestion error: ${err.message}`);
        emit('error', { message: err.message || 'Ingestion failed' });
    }
}

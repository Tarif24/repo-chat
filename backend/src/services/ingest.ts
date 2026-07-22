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
import { updateIngestProgressStatus } from '../repositories/ingestProgressRepository.js';
import { checkRepoBelowStorageLimit, canIngestRepo } from '../services/storage.js';
import { cacheInvalidate } from '../services/semanticCache.js';

export async function ingestRepo(repoURL: string): Promise<void> {
    try {
        logger.info(`REPO: ${repoURL} - Starting ingestion process.`);

        initializeDirectory();

        const existingRepo = await getRepoByURL(repoURL);
        const latestSha = await getLatestSha(repoURL);

        // If the repository already exists and the latest SHA matches, skip re-ingestion but update the last accessed time
        if (existingRepo && latestSha && existingRepo.latestSHA === latestSha) {
            await updateRepoLastAccessed(repoURL);
            await updateIngestProgressStatus(
                repoURL,
                'complete',
                'complete',
                'Repository is up to date. No need to re-ingest',
                {
                    latestSha,
                    success: true,
                }
            );
            logger.info(`REPO: ${repoURL} - Repository is up to date. No need to re-ingest.`);
            return;
        }

        // --- cloning stage ---

        // Clone the repository and get the latest SHA
        await updateIngestProgressStatus(repoURL, 'processing', 'cloning', 'Cloning repository...');
        const repoSha = await cloneAndGetSha(repoURL, appConfig.repoStoragePath);

        if (!repoSha) {
            await updateIngestProgressStatus(
                repoURL,
                'error',
                'error',
                'Failed to clone repository',
                { success: false }
            );
            logger.error(`REPO: ${repoURL} - Failed to clone repository.`);
            return;
        }

        // Invalidate cache for the repository if it already exists but has new commits
        if (existingRepo) {
            await cacheInvalidate(repoURL);
        }

        // --- scanning stage ---

        await updateIngestProgressStatus(repoURL, 'processing', 'scanning', 'Scanning files...');

        // Scan the cloned repository for parseable files
        const { validFiles, validFilesSize, totalScanned } = collectParseableFiles(
            appConfig.repoStoragePath,
            repoURL
        );
        await updateIngestProgressStatus(
            repoURL,
            'processing',
            'scanning',
            `Found ${validFiles?.length ?? 0} parseable files (scanned ${totalScanned ? totalScanned : 0})`,
            {
                fileCount: validFiles?.length ?? 0,
                totalFileCount: totalScanned ? totalScanned : 0,
            }
        );

        // Estimate the storage requirements for the repository and check against limits
        const storageCheck = checkRepoBelowStorageLimit(validFilesSize, 25, false, true);

        logger.info(
            `REPO: ${repoURL} - Storage estimate for repository: ${storageCheck.estimate.confirmedTotalMB.toFixed(
                2
            )} MB.`
        );

        logger.info(
            `REPO: ${repoURL} - Storage estimate for repository with buffer: ${storageCheck.bufferMB.toFixed(
                2
            )} MB.`
        );

        await updateIngestProgressStatus(
            repoURL,
            'processing',
            'storageCheck',
            `Estimated size: ${storageCheck.bufferMB.toFixed(2) ?? 0} MB`,
            {
                estimateMB: storageCheck.estimate.confirmedTotalMB.toFixed(2),
                estimateWithBufferMB: storageCheck.bufferMB.toFixed(2),
            }
        );

        // If the repository exceeds the storage limit, abort ingestion and clean up the cloned files
        if (!storageCheck.allowed) {
            logger.warn(
                `REPO: ${repoURL} - Repository exceeds storage limit. Ingestion aborted. Reason: ${storageCheck.reason}`
            );

            // Clear the cloned repository from disk to save space
            await deleteEverythingInDir(appConfig.repoStoragePath);

            await updateIngestProgressStatus(
                repoURL,
                'error',
                'error',
                `Repository exceeds storage limit. ${storageCheck.reason}`,
                { success: false }
            );
            return;
        }

        // Check if the repository can be ingested based on current database storage stats
        const dbStorageCheck = await canIngestRepo(storageCheck.bufferMB, 90);

        logger.info(
            `REPO: ${repoURL} - Database storage check for repository ingestion: used: ${dbStorageCheck.databaseStats.usedMB.toFixed(2)}/${dbStorageCheck.databaseStats.limitMB.toFixed(
                2
            )} MB. Used percentage: ${dbStorageCheck.databaseStats.usedPct.toFixed(2)}%.`
        );

        // If the database does not have enough storage to ingest the repository, abort and clean up the cloned files
        if (!dbStorageCheck.allowed) {
            logger.warn(
                `REPO: ${repoURL} - Not enough database storage to ingest repository. Ingestion aborted. Reason: ${dbStorageCheck.reason}`
            );

            // Clear the cloned repository from disk to save space
            await deleteEverythingInDir(appConfig.repoStoragePath);

            await updateIngestProgressStatus(
                repoURL,
                'error',
                'error',
                `Repository exceeds database storage limit. ${dbStorageCheck.reason}`,
                { success: false }
            );
            return;
        }

        // If the repository already exists but the latest SHA is different, update the repo record
        if (existingRepo) {
            await updateRepo(repoURL, repoSha);
            // If the repository does not exist, create a new repo record
        } else {
            await initializeNewRepo(repoURL, repoSha);
        }

        // Create and store the file tree structure in the database
        const fileTree = createParseableFilesTree(appConfig.repoStoragePath);
        if (fileTree) {
            await updateRepoFileTree(repoURL, fileTree);
        }

        // --- chunking stage ---

        // Parse the valid files using Tree-sitter
        await updateIngestProgressStatus(repoURL, 'processing', 'chunking', 'Chunking files...');

        const allCodeChunks = await parseFiles(validFiles || [], repoURL);

        await updateIngestProgressStatus(
            repoURL,
            'processing',
            'chunking',
            `${allCodeChunks.length ?? 0} chunks produced`,
            {
                chunkCount: allCodeChunks.length,
            }
        );

        // Clear the cloned repository from disk to save space
        await deleteEverythingInDir(appConfig.repoStoragePath);

        // --- embedding + storing stage ---

        // Process and store the code chunks in the database
        await processAndStoreChunks(allCodeChunks, repoURL, async (event, data: any) => {
            if (event === 'error') {
                await updateIngestProgressStatus(
                    repoURL,
                    'error',
                    'error',
                    data.message || 'Chunk processing failed'
                );
                return;
            }
            // event === 'embeddingAndProcessing'
            await updateIngestProgressStatus(
                repoURL,
                'processing',
                'embeddingAndProcessing',
                data.message || 'Embedding and processing chunks',
                {
                    current: data.current,
                    totalChunks: data.totalChunks,
                }
            );
        });

        // --- complete ---
        await updateIngestProgressStatus(
            repoURL,
            'complete',
            'complete',
            'Repository ingested successfully',
            {
                latestSha: repoSha,
                chunkCount: allCodeChunks.length,
                success: true,
            }
        );

        logger.info(`REPO: ${repoURL} - Repository ingested successfully.`);
    } catch (err: any) {
        logger.error(`REPO: ${repoURL} - Ingestion error: ${err.message}`);
        await updateIngestProgressStatus(
            repoURL,
            'error',
            'error',
            `Ingestion error: ${err.message}`,
            { success: false }
        );
    }
}

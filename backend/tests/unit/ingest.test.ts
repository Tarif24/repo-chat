jest.mock('../../src/lib/logger.js', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../../src/config/config.js', () => ({
    appConfig: {
        repoStoragePath: '/tmp/repoCloning',
    },
}));

jest.mock('../../src/services/gitHub.js', () => ({
    cloneAndGetSha: jest.fn(),
    getLatestSha: jest.fn(),
}));

jest.mock('../../src/services/files.js', () => ({
    initializeDirectory: jest.fn(),
    collectParseableFiles: jest.fn(),
    createParseableFilesTree: jest.fn(),
    deleteEverythingInDir: jest.fn(),
}));

jest.mock('../../src/services/treeSitter.js', () => ({
    parseFiles: jest.fn(),
}));

jest.mock('../../src/services/chunkProcessing.js', () => ({
    processAndStoreChunks: jest.fn(),
}));

jest.mock('../../src/services/repoProcessing.js', () => ({
    initializeNewRepo: jest.fn(),
    getRepoByURL: jest.fn(),
    updateRepo: jest.fn(),
    updateRepoFileTree: jest.fn(),
    updateRepoLastAccessed: jest.fn(),
}));

jest.mock('../../src/repositories/ingestProgressRepository.js', () => ({
    updateIngestProgressStatus: jest.fn(),
}));

jest.mock('../../src/services/storage.js', () => ({
    checkRepoBelowStorageLimit: jest.fn(),
    canIngestRepo: jest.fn(),
}));

jest.mock('../../src/services/semanticCache.js', () => ({
    cacheInvalidate: jest.fn(),
}));

import { getLatestSha, cloneAndGetSha } from '../../src/services/gitHub.js';
import {
    initializeDirectory,
    collectParseableFiles,
    createParseableFilesTree,
    deleteEverythingInDir,
} from '../../src/services/files.js';
import { parseFiles } from '../../src/services/treeSitter.js';
import { processAndStoreChunks } from '../../src/services/chunkProcessing.js';
import {
    initializeNewRepo,
    getRepoByURL,
    updateRepoFileTree,
    updateRepoLastAccessed,
} from '../../src/services/repoProcessing.js';
import { updateIngestProgressStatus } from '../../src/repositories/ingestProgressRepository.js';
import { checkRepoBelowStorageLimit, canIngestRepo } from '../../src/services/storage.js';
import { ingestRepo } from '../../src/services/ingest.js';

const mockGetLatestSha = getLatestSha as jest.Mock;
const mockCloneAndGetSha = cloneAndGetSha as jest.Mock;
const mockInitializeDirectory = initializeDirectory as jest.Mock;
const mockCollectParseableFiles = collectParseableFiles as jest.Mock;
const mockCreateParseableFilesTree = createParseableFilesTree as jest.Mock;
const mockDeleteEverythingInDir = deleteEverythingInDir as jest.Mock;
const mockParseFiles = parseFiles as jest.Mock;
const mockProcessAndStoreChunks = processAndStoreChunks as jest.Mock;
const mockInitializeNewRepo = initializeNewRepo as jest.Mock;
const mockGetRepoByURL = getRepoByURL as jest.Mock;
const mockUpdateRepoFileTree = updateRepoFileTree as jest.Mock;
const mockUpdateRepoLastAccessed = updateRepoLastAccessed as jest.Mock;
const mockUpdateIngestProgressStatus = updateIngestProgressStatus as jest.Mock;
const mockCheckRepoBelowStorageLimit = checkRepoBelowStorageLimit as jest.Mock;
const mockCanIngestRepo = canIngestRepo as jest.Mock;

describe('ingest service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInitializeDirectory.mockImplementation(() => undefined);
        mockDeleteEverythingInDir.mockResolvedValue(undefined);
        mockUpdateIngestProgressStatus.mockResolvedValue(undefined);
    });

    // checks that a repo already at the latest SHA exits early and only updates access tracking
    it('returns early when the repository is already up to date', async () => {
        const repoURL = 'https://example.com/repo.git';
        mockGetRepoByURL.mockResolvedValueOnce({ repoURL, latestSHA: 'abc123' });
        mockGetLatestSha.mockResolvedValueOnce('abc123');

        await ingestRepo(repoURL);

        expect(mockUpdateRepoLastAccessed).toHaveBeenCalledTimes(1);
        expect(mockUpdateRepoLastAccessed).toHaveBeenCalledWith(repoURL);
        expect(mockUpdateIngestProgressStatus).toHaveBeenCalledWith(
            repoURL,
            'complete',
            'complete',
            'Repository is up to date. No need to re-ingest',
            {
                latestSha: 'abc123',
                success: true,
            }
        );
        expect(mockCloneAndGetSha).not.toHaveBeenCalled();
    });

    // checks that a failed clone records an error state and stops the workflow
    it('records an error when cloning does not return a SHA', async () => {
        const repoURL = 'https://example.com/repo.git';
        mockGetRepoByURL.mockResolvedValueOnce(null);
        mockGetLatestSha.mockResolvedValueOnce('abc123');
        mockCloneAndGetSha.mockResolvedValueOnce(undefined);

        await ingestRepo(repoURL);

        expect(mockUpdateIngestProgressStatus).toHaveBeenCalledWith(
            repoURL,
            'error',
            'error',
            'Failed to clone repository',
            { success: false }
        );
        expect(mockCollectParseableFiles).not.toHaveBeenCalled();
    });

    // checks that the service aborts and cleans up when the storage estimate is too large
    it('aborts ingestion and clears the repo directory when storage is over the limit', async () => {
        const repoURL = 'https://example.com/repo.git';
        mockGetRepoByURL.mockResolvedValueOnce(null);
        mockGetLatestSha.mockResolvedValueOnce('abc123');
        mockCloneAndGetSha.mockResolvedValueOnce('newsha');
        mockCollectParseableFiles.mockReturnValueOnce({
            validFiles: [{ name: 'file.ts' }],
            validFilesSize: 12_000,
            totalScanned: 1,
        });
        mockCheckRepoBelowStorageLimit.mockReturnValueOnce({
            allowed: false,
            estimate: { confirmedTotalMB: 100 },
            bufferMB: 120,
            reason: 'too large',
        });

        await ingestRepo(repoURL);

        expect(mockDeleteEverythingInDir).toHaveBeenCalledWith('/tmp/repoCloning');
        expect(mockUpdateIngestProgressStatus).toHaveBeenCalledWith(
            repoURL,
            'error',
            'error',
            'Repository exceeds storage limit. too large',
            { success: false }
        );
        expect(mockCanIngestRepo).not.toHaveBeenCalled();
    });

    // checks that database storage pressure causes the workflow to stop before ingesting chunks
    it('aborts ingestion when the database storage check fails', async () => {
        const repoURL = 'https://example.com/repo.git';
        mockGetRepoByURL.mockResolvedValueOnce(null);
        mockGetLatestSha.mockResolvedValueOnce('abc123');
        mockCloneAndGetSha.mockResolvedValueOnce('newsha');
        mockCollectParseableFiles.mockReturnValueOnce({
            validFiles: [{ name: 'file.ts' }],
            validFilesSize: 12_000,
            totalScanned: 1,
        });
        mockCheckRepoBelowStorageLimit.mockReturnValueOnce({
            allowed: true,
            estimate: { confirmedTotalMB: 10 },
            bufferMB: 11,
        });
        mockCanIngestRepo.mockResolvedValueOnce({
            allowed: false,
            reason: 'database full',
            databaseStats: { usedMB: 90, limitMB: 100, usedPct: 90 },
        });

        await ingestRepo(repoURL);

        expect(mockDeleteEverythingInDir).toHaveBeenCalledWith('/tmp/repoCloning');
        expect(mockUpdateIngestProgressStatus).toHaveBeenCalledWith(
            repoURL,
            'error',
            'error',
            'Repository exceeds database storage limit. database full',
            { success: false }
        );
        expect(mockInitializeNewRepo).not.toHaveBeenCalled();
    });

    // checks that the happy path creates the repo record, processes chunks, and finishes successfully
    it('completes the ingestion pipeline for a new repository', async () => {
        const repoURL = 'https://example.com/repo.git';
        mockGetRepoByURL.mockResolvedValueOnce(null);
        mockGetLatestSha.mockResolvedValueOnce('abc123');
        mockCloneAndGetSha.mockResolvedValueOnce('newsha');
        mockCollectParseableFiles.mockReturnValueOnce({
            validFiles: [{ name: 'file.ts' }],
            validFilesSize: 12_000,
            totalScanned: 1,
        });
        mockCheckRepoBelowStorageLimit.mockReturnValueOnce({
            allowed: true,
            estimate: { confirmedTotalMB: 10 },
            bufferMB: 11,
        });
        mockCanIngestRepo.mockResolvedValueOnce({
            allowed: true,
            databaseStats: { usedMB: 10, limitMB: 100, usedPct: 10 },
        });
        mockCreateParseableFilesTree.mockReturnValueOnce({ name: 'root', type: 'directory' });
        mockParseFiles.mockResolvedValueOnce([{ name: 'chunk-1' }]);
        mockProcessAndStoreChunks.mockImplementationOnce(async (_chunks, _repoURL, emit) => {
            await emit('embeddingAndProcessing', {
                message: '1 / 1 chunks embedded',
                current: 1,
                totalChunks: 1,
            });
        });

        await ingestRepo(repoURL);

        expect(mockInitializeNewRepo).toHaveBeenCalledWith(repoURL, 'newsha');
        expect(mockUpdateRepoFileTree).toHaveBeenCalledWith(repoURL, {
            name: 'root',
            type: 'directory',
        });
        expect(mockParseFiles).toHaveBeenCalledWith([{ name: 'file.ts' }], repoURL);
        expect(mockProcessAndStoreChunks).toHaveBeenCalledWith(
            [{ name: 'chunk-1' }],
            repoURL,
            expect.any(Function)
        );
        expect(mockUpdateIngestProgressStatus).toHaveBeenCalledWith(
            repoURL,
            'complete',
            'complete',
            'Repository ingested successfully',
            {
                latestSha: 'newsha',
                chunkCount: 1,
                success: true,
            }
        );
    });

    // checks that unexpected errors are converted into an error progress update instead of crashing
    it('records an error status when an unexpected exception occurs', async () => {
        const repoURL = 'https://example.com/repo.git';
        mockGetRepoByURL.mockRejectedValueOnce(new Error('boom'));

        await ingestRepo(repoURL);

        expect(mockUpdateIngestProgressStatus).toHaveBeenCalledWith(
            repoURL,
            'error',
            'error',
            'Ingestion error: boom',
            { success: false }
        );
    });
});

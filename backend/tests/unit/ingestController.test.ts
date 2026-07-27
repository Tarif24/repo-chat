// Mock the imported services and logger before importing the controller module
jest.mock('../../src/services/ingest.js', () => ({
    ingestRepo: jest.fn(),
}));

jest.mock('../../src/services/ingestProgress.js', () => ({
    createRepoIngestStatus: jest.fn(),
    getRepoIngestStatus: jest.fn(),
    deleteRepoIngestStatus: jest.fn(),
}));

jest.mock('../../src/lib/logger.js', () => ({
    default: {
        error: jest.fn(),
    },
}));

import { ingestRepo } from '../../src/services/ingest.js';
import {
    createRepoIngestStatus,
    getRepoIngestStatus,
    deleteRepoIngestStatus,
} from '../../src/services/ingestProgress.js';
import logger from '../../src/lib/logger.js';
import { ingest, getIngestStatus } from '../../src/controllers/ingestController.js';

const mockIngestRepo = ingestRepo as jest.Mock;
const mockCreateRepoIngestStatus = createRepoIngestStatus as jest.Mock;
const mockGetRepoIngestStatus = getRepoIngestStatus as jest.Mock;
const mockDeleteRepoIngestStatus = deleteRepoIngestStatus as jest.Mock;
const mockLoggerError = logger.error as jest.Mock;

describe('ingest controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates ingest status and then calls ingestRepo with the repo URL', async () => {
        mockCreateRepoIngestStatus.mockResolvedValueOnce(undefined);
        mockIngestRepo.mockResolvedValueOnce(undefined);

        await ingest('https://example.com/repo');

        expect(mockCreateRepoIngestStatus).toHaveBeenCalledTimes(1);
        expect(mockCreateRepoIngestStatus).toHaveBeenCalledWith('https://example.com/repo');
        expect(mockIngestRepo).toHaveBeenCalledTimes(1);
        expect(mockIngestRepo).toHaveBeenCalledWith('https://example.com/repo');
    });

    it('logs errors from ingestRepo without throwing them', async () => {
        mockCreateRepoIngestStatus.mockResolvedValueOnce(undefined);
        mockIngestRepo.mockRejectedValueOnce(new Error('ingest failure'));

        await expect(ingest('https://example.com/repo')).resolves.toBeUndefined();

        expect(mockLoggerError).toHaveBeenCalledTimes(1);
        expect(mockLoggerError).toHaveBeenCalledWith(
            'REPO: https://example.com/repo - Unhandled ingestion error: ingest failure'
        );
    });

    it('returns the status object unchanged when status is not terminal', async () => {
        const status = { status: 'processing', statusStage: 'cloning' };
        mockGetRepoIngestStatus.mockResolvedValueOnce(status);

        const result = await getIngestStatus('https://example.com/repo');

        expect(result).toBe(status);
        expect(mockDeleteRepoIngestStatus).not.toHaveBeenCalled();
    });

    it('deletes ingest progress when status is complete', async () => {
        const status = { status: 'complete', statusStage: 'chunking' };
        mockGetRepoIngestStatus.mockResolvedValueOnce(status);
        mockDeleteRepoIngestStatus.mockResolvedValueOnce(undefined);

        const result = await getIngestStatus('https://example.com/repo');

        expect(result).toBe(status);
        expect(mockDeleteRepoIngestStatus).toHaveBeenCalledTimes(1);
        expect(mockDeleteRepoIngestStatus).toHaveBeenCalledWith('https://example.com/repo');
    });

    it('deletes ingest progress when status is error', async () => {
        const status = { status: 'error', statusStage: 'cloning' };
        mockGetRepoIngestStatus.mockResolvedValueOnce(status);
        mockDeleteRepoIngestStatus.mockResolvedValueOnce(undefined);

        const result = await getIngestStatus('https://example.com/repo');

        expect(result).toBe(status);
        expect(mockDeleteRepoIngestStatus).toHaveBeenCalledTimes(1);
        expect(mockDeleteRepoIngestStatus).toHaveBeenCalledWith('https://example.com/repo');
    });

    it('propagates errors from getRepoIngestStatus', async () => {
        mockGetRepoIngestStatus.mockRejectedValueOnce(new Error('status failure'));

        await expect(getIngestStatus('https://example.com/repo')).rejects.toThrow('status failure');
    });
});

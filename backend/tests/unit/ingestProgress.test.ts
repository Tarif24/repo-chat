// Mock the repository module so we can control its behavior
jest.mock('../../src/repositories/ingestProgressRepository.js', () => ({
    createIngestProgress: jest.fn(),
    getIngestProgressStatus: jest.fn(),
    deleteIngestProgress: jest.fn(),
}));

import { createIngestProgress, getIngestProgressStatus, deleteIngestProgress } from '../../src/repositories/ingestProgressRepository.js';

import { createRepoIngestStatus, getRepoIngestStatus, deleteRepoIngestStatus } from '../../src/services/ingestProgress.js';

const mockCreate = createIngestProgress as jest.Mock;
const mockGet = getIngestProgressStatus as jest.Mock;
const mockDelete = deleteIngestProgress as jest.Mock;

describe('services/ingestProgress', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // verifies createRepoIngestStatus forwards the repoURL and returns the created doc
    it('forwards repoURL to createIngestProgress and returns its result', async () => {
        const fake = { repoURL: 'https://example.com/repo', _id: 'abc' };
        mockCreate.mockResolvedValueOnce(fake);

        const result = await createRepoIngestStatus('https://example.com/repo');

        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith('https://example.com/repo');
        expect(result).toEqual(fake);
    });

    // ensures errors from createIngestProgress propagate instead of being swallowed
    it('propagates errors from createIngestProgress', async () => {
        mockCreate.mockRejectedValueOnce(new Error('create failed'));

        await expect(createRepoIngestStatus('u')).rejects.toThrow('create failed');
    });

    // verifies getRepoIngestStatus forwards the repoURL and returns repository result
    it('returns the status object from getIngestProgressStatus', async () => {
        const status = { status: 'processing', statusStage: 'cloning' };
        mockGet.mockResolvedValueOnce(status);

        const result = await getRepoIngestStatus('https://example.com/repo');

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith('https://example.com/repo');
        expect(result).toEqual(status);
    });

    // verifies deleteRepoIngestStatus calls deleteIngestProgress with the repoURL
    it('calls deleteIngestProgress and resolves', async () => {
        mockDelete.mockResolvedValueOnce({ deletedCount: 1 });

        await deleteRepoIngestStatus('https://example.com/repo');

        expect(mockDelete).toHaveBeenCalledTimes(1);
        expect(mockDelete).toHaveBeenCalledWith('https://example.com/repo');
    });

    // ensures errors from deleteIngestProgress propagate instead of being swallowed
    it('propagates errors from deleteIngestProgress', async () => {
        mockDelete.mockRejectedValueOnce(new Error('delete failed'));

        await expect(deleteRepoIngestStatus('u')).rejects.toThrow('delete failed');
    });
});

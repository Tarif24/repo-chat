jest.mock('../../src/repositories/chunkRepository.js', () => ({
    deleteChunksByRepoURL: jest.fn(),
}));

jest.mock('../../src/repositories/repoRepository.js', () => ({
    findRepoByURL: jest.fn(),
    createRepo: jest.fn(),
    updateLastAccessed: jest.fn(),
    updateLatestSHA: jest.fn(),
    updateFileTree: jest.fn(),
    getAllRepositories: jest.fn(),
    deleteRepoByURL: jest.fn(),
}));

jest.mock('../../src/lib/logger.js', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
    },
}));

import logger from '../../src/lib/logger.js';
import { deleteChunksByRepoURL } from '../../src/repositories/chunkRepository.js';
import {
    createRepo,
    deleteRepoByURL,
    findRepoByURL,
    getAllRepositories,
    updateFileTree,
    updateLastAccessed,
    updateLatestSHA,
} from '../../src/repositories/repoRepository.js';
import {
    deleteRepoAndChunks,
    getAllRepos,
    getRepoByURL,
    initializeNewRepo,
    updateRepo,
    updateRepoFileTree,
    updateRepoLastAccessed,
    updateRepoLatestSHA,
} from '../../src/services/repoProcessing.js';

const mockDeleteChunksByRepoURL = deleteChunksByRepoURL as jest.Mock;
const mockFindRepoByURL = findRepoByURL as jest.Mock;
const mockCreateRepo = createRepo as jest.Mock;
const mockUpdateLatestSHA = updateLatestSHA as jest.Mock;
const mockUpdateLastAccessed = updateLastAccessed as jest.Mock;
const mockUpdateFileTree = updateFileTree as jest.Mock;
const mockGetAllRepositories = getAllRepositories as jest.Mock;
const mockDeleteRepoByURL = deleteRepoByURL as jest.Mock;
const mockLoggerInfo = logger.info as jest.Mock;

describe('repoProcessing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // This checks that a new repo record is created when no existing repo is found.
    it('creates a new repository record when no existing repo is found', async () => {
        mockFindRepoByURL.mockResolvedValueOnce(null);
        const createdRepo = { repoURL: 'https://example.com/repo', latestSHA: 'abc123' };
        mockCreateRepo.mockResolvedValueOnce(createdRepo);

        const result = await initializeNewRepo('https://example.com/repo', 'abc123');

        expect(mockFindRepoByURL).toHaveBeenCalledWith('https://example.com/repo');
        expect(mockCreateRepo).toHaveBeenCalledWith({
            repoURL: 'https://example.com/repo',
            latestSHA: 'abc123',
        });
        expect(mockUpdateLatestSHA).not.toHaveBeenCalled();
        expect(mockUpdateLastAccessed).not.toHaveBeenCalled();
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'REPO: https://example.com/repo - Initialized new repository.'
        );
        expect(result).toEqual(createdRepo);
    });

    // This checks that an existing repo is updated in place instead of being recreated.
    it('updates an existing repository instead of creating a duplicate', async () => {
        const existingRepo = { repoURL: 'https://example.com/repo', latestSHA: 'old-sha' };
        const updatedRepo = { ...existingRepo, latestSHA: 'new-sha' };
        mockFindRepoByURL
            .mockResolvedValueOnce(existingRepo)
            .mockResolvedValueOnce(updatedRepo);
        mockUpdateLatestSHA.mockResolvedValueOnce(updatedRepo);
        mockUpdateLastAccessed.mockResolvedValueOnce(updatedRepo);

        const result = await initializeNewRepo('https://example.com/repo', 'new-sha');

        expect(mockUpdateLatestSHA).toHaveBeenCalledWith('https://example.com/repo', 'new-sha');
        expect(mockUpdateLastAccessed).toHaveBeenCalledWith('https://example.com/repo');
        expect(mockCreateRepo).not.toHaveBeenCalled();
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'REPO: https://example.com/repo - Repository already exists. Updated latest SHA and last accessed time.'
        );
        expect(result).toEqual(updatedRepo);
    });

    // This checks that updating a repo refreshes its metadata and clears old chunks.
    it('updates the repo metadata and clears chunks for the repo', async () => {
        await updateRepo('https://example.com/repo', 'new-sha');

        expect(mockUpdateLatestSHA).toHaveBeenCalledWith('https://example.com/repo', 'new-sha');
        expect(mockUpdateLastAccessed).toHaveBeenCalledWith('https://example.com/repo');
        expect(mockDeleteChunksByRepoURL).toHaveBeenCalledWith('https://example.com/repo');
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'REPO: https://example.com/repo - Updated repository with new latest SHA and reset last accessed time.'
        );
    });

    // This checks that updating the latest SHA returns the repository update result.
    it('returns the result from updating the latest SHA', async () => {
        const updatedRepo = { repoURL: 'https://example.com/repo', latestSHA: 'new-sha' };
        mockUpdateLatestSHA.mockResolvedValueOnce(updatedRepo);

        const result = await updateRepoLatestSHA('https://example.com/repo', 'new-sha');

        expect(mockUpdateLatestSHA).toHaveBeenCalledWith('https://example.com/repo', 'new-sha');
        expect(result).toEqual(updatedRepo);
    });

    // This checks that updating the last-accessed timestamp returns the repository update result.
    it('returns the result from updating the last-accessed timestamp', async () => {
        const updatedRepo = { repoURL: 'https://example.com/repo', lastAccessed: new Date() };
        mockUpdateLastAccessed.mockResolvedValueOnce(updatedRepo);

        const result = await updateRepoLastAccessed('https://example.com/repo');

        expect(mockUpdateLastAccessed).toHaveBeenCalledWith('https://example.com/repo');
        expect(result).toEqual(updatedRepo);
    });

    // This checks that fetching a repo by URL delegates to the repository layer.
    it('returns the repo found by URL from the repository layer', async () => {
        const repo = { repoURL: 'https://example.com/repo', latestSHA: 'abc123' };
        mockFindRepoByURL.mockResolvedValueOnce(repo);

        const result = await getRepoByURL('https://example.com/repo');

        expect(mockFindRepoByURL).toHaveBeenCalledWith('https://example.com/repo');
        expect(result).toEqual(repo);
    });

    // This checks that updating the file tree delegates to the repository layer.
    it('passes the file tree update through to the repository layer', async () => {
        const fileTree = { name: 'src', children: [] };
        const updatedRepo = { repoURL: 'https://example.com/repo', fileTree };
        mockUpdateFileTree.mockResolvedValueOnce(updatedRepo);

        const result = await updateRepoFileTree('https://example.com/repo', fileTree);

        expect(mockUpdateFileTree).toHaveBeenCalledWith('https://example.com/repo', fileTree);
        expect(result).toEqual(updatedRepo);
    });

    // This checks that fetching all repos delegates to the repository layer.
    it('returns all repositories from the repository layer', async () => {
        const repos = [{ repoURL: 'https://example.com/repo', latestSHA: 'abc123' }];
        mockGetAllRepositories.mockResolvedValueOnce(repos);

        const result = await getAllRepos();

        expect(mockGetAllRepositories).toHaveBeenCalledTimes(1);
        expect(result).toEqual(repos);
    });

    // This checks that deleting a repo also deletes its chunks.
    it('deletes the repo and its chunks together', async () => {
        await deleteRepoAndChunks('https://example.com/repo');

        expect(mockDeleteChunksByRepoURL).toHaveBeenCalledWith('https://example.com/repo');
        expect(mockDeleteRepoByURL).toHaveBeenCalledWith('https://example.com/repo');
    });
});

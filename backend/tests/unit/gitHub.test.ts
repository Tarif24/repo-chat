jest.mock('../../src/config/config.js', () => ({
    appConfig: {
        repoStoragePath: '/tmp/repo-storage',
    },
}));

jest.mock('../../src/services/files.js', () => ({
    deleteEverythingInDir: jest.fn(),
}));

jest.mock('simple-git', () => ({
    simpleGit: jest.fn(),
}));

import { appConfig } from '../../src/config/config.js';
import { deleteEverythingInDir } from '../../src/services/files.js';
import { simpleGit } from 'simple-git';
import { cloneAndGetSha, getLatestSha, validateGithubRepo } from '../../src/services/gitHub.js';

const mockDeleteEverythingInDir = deleteEverythingInDir as jest.Mock;
const mockSimpleGit = simpleGit as jest.Mock;

const mockGitInstance = {
    listRemote: jest.fn(),
    clone: jest.fn(),
    log: jest.fn(),
};

describe('gitHub service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSimpleGit.mockReturnValue(mockGitInstance);
        mockDeleteEverythingInDir.mockResolvedValue(undefined);
        mockGitInstance.listRemote.mockReset();
        mockGitInstance.clone.mockReset();
        mockGitInstance.log.mockReset();
    });

    it('returns valid when the remote repository can be reached', async () => {
        mockGitInstance.listRemote.mockResolvedValueOnce('ok');

        const result = await validateGithubRepo('https://github.com/example/repo.git');

        expect(result).toEqual({ isValid: true });
        expect(mockGitInstance.listRemote).toHaveBeenCalledWith(['https://github.com/example/repo.git']);
    });

    it('returns a private-repository reason when the remote rejects with an authentication error', async () => {
        mockGitInstance.listRemote.mockRejectedValueOnce(new Error('Authentication failed'));

        const result = await validateGithubRepo('https://github.com/example/repo.git');

        expect(result).toEqual({
            isValid: false,
            reason: 'Repository is private or requires authentication',
        });
    });

    it('returns a missing-repository reason when the remote reports that the repo does not exist', async () => {
        mockGitInstance.listRemote.mockRejectedValueOnce(new Error('Repository not found'));

        const result = await validateGithubRepo('https://github.com/example/repo.git');

        expect(result).toEqual({ isValid: false, reason: 'Repository does not exist' });
    });

    it('returns an unreachable reason for any other remote error', async () => {
        mockGitInstance.listRemote.mockRejectedValueOnce(new Error('network timeout'));

        const result = await validateGithubRepo('https://github.com/example/repo.git');

        expect(result).toEqual({ isValid: false, reason: 'Unreachable: network timeout' });
    });

    it('clones the repository and returns the latest commit hash when the repo is valid', async () => {
        mockGitInstance.listRemote.mockResolvedValueOnce('ok');
        mockGitInstance.log.mockResolvedValueOnce({ latest: { hash: 'abc123' } });

        const result = await cloneAndGetSha('https://github.com/example/repo.git', '/tmp/local-repo');

        expect(mockDeleteEverythingInDir).toHaveBeenCalledWith(appConfig.repoStoragePath);
        expect(mockGitInstance.clone).toHaveBeenCalledWith(
            'https://github.com/example/repo.git',
            '/tmp/local-repo',
            ['--depth', '1']
        );
        expect(mockGitInstance.log).toHaveBeenCalledWith({ maxCount: 1 });
        expect(result).toBe('abc123');
    });

    it('throws a not-found error when the repository validation fails before cloning', async () => {
        mockGitInstance.listRemote.mockRejectedValueOnce(new Error('Repository not found'));

        await expect(cloneAndGetSha('https://github.com/example/repo.git', '/tmp/local-repo')).rejects.toThrow(
            'Invalid repository: Repository does not exist'
        );
        expect(mockGitInstance.clone).not.toHaveBeenCalled();
    });

    it('returns the SHA for the requested branch when the remote exposes it', async () => {
        mockGitInstance.listRemote
            .mockResolvedValueOnce('ok')
            .mockResolvedValueOnce('123 refs/heads/main\n456 refs/heads/dev');

        const result = await getLatestSha('https://github.com/example/repo.git', 'dev');

        expect(result).toBe('456 refs/heads/dev');
        expect(mockGitInstance.listRemote).toHaveBeenCalledWith(['--heads', 'https://github.com/example/repo.git']);
    });

    it('throws a not-found error when the requested branch is missing from the remote', async () => {
        mockGitInstance.listRemote
            .mockResolvedValueOnce('ok')
            .mockResolvedValueOnce('123 refs/heads/main');

        await expect(getLatestSha('https://github.com/example/repo.git', 'dev')).rejects.toThrow(
            'Branch "dev" not found'
        );
    });
});

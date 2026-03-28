import type { SimpleGit, LogResult } from 'simple-git';
import { simpleGit } from 'simple-git';
import { NotFoundError } from '../error/appError.js';
import { readdir, rm } from 'fs/promises';
import { join } from 'path';

async function deleteEverythingInDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
        entries.map(async entry => {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                await deleteEverythingInDir(fullPath);
                await rm(fullPath, { recursive: true, force: true });
            } else {
                await rm(fullPath, { force: true });
            }
        })
    );
}

// Validate if a GitHub repo URL is valid and accessible
export async function validateGithubRepo(
    repoUrl: string
): Promise<{ isValid: boolean; reason?: string }> {
    try {
        const git: SimpleGit = simpleGit();
        await git.listRemote([repoUrl]);
        return { isValid: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (
            message.includes('Authentication failed') ||
            message.includes('could not read Username')
        ) {
            return { isValid: false, reason: 'Repository is private or requires authentication' };
        }
        if (message.includes('not found') || message.includes('Repository not found')) {
            return { isValid: false, reason: 'Repository does not exist' };
        }

        return { isValid: false, reason: `Unreachable: ${message}` };
    }
}

// Clone a repo and get its latest SHA
export async function cloneAndGetSha(
    repoUrl: string,
    localPath = './repoCloning'
): Promise<string> {
    await deleteEverythingInDir('./repoCloning');

    const validation = await validateGithubRepo(repoUrl);
    if (!validation.isValid) {
        throw new NotFoundError(`Invalid repository: ${validation.reason}`);
    }

    const git: SimpleGit = simpleGit();
    await git.clone(repoUrl, localPath);

    const repoGit: SimpleGit = simpleGit(localPath);
    const log: LogResult = await repoGit.log({ maxCount: 1 });

    if (!log.latest) throw new NotFoundError('No commits found');
    return log.latest.hash;
}

// Get latest SHA without cloning
export async function getLatestSha(
    repoUrl: string,
    branch: string = 'main'
): Promise<string | undefined> {
    const validation = await validateGithubRepo(repoUrl);
    if (!validation.isValid) {
        throw new NotFoundError(`Invalid repository: ${validation.reason}`);
    }

    const git: SimpleGit = simpleGit();
    const remoteInfo: string = await git.listRemote(['--heads', repoUrl]);

    const line = remoteInfo
        .trim()
        .split('\n')
        .find(l => l.includes(`refs/heads/${branch}`));

    if (!line) throw new NotFoundError(`Branch "${branch}" not found`);

    const sha: string | undefined = line.split('\t')[0];
    return sha;
}

import { getAllRepos, updateRepoLastAccessed, getRepoByURL } from '../services/repoProcessing.js';

export async function userQuery(query: string, repoUrl: string) {
    // Update the last accessed time for the repository in the database
    await updateRepoLastAccessed(repoUrl);

    return `You asked: "${query}" for the repository: ${repoUrl}. This is a placeholder response.`;
}

export async function getAllRepositories() {
    const repos = await getAllRepos();

    const repoNames = repos.map(repo => repo.repoURL);

    return repoNames;
}

export async function getRepositoryByURL(repoUrl: string) {
    const repo = await getRepoByURL(repoUrl);
    if (!repo) {
        return `Repository with URL ${repoUrl} not found.`;
    }
    return repo;
}

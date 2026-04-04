import { getAllRepos } from '../services/repoProcessing.js';

export async function userQuery(query: string, repoUrl: string) {
    return `You asked: "${query}" for the repository: ${repoUrl}. This is a placeholder response.`;
}

export async function getAllRepositories() {
    const repos = await getAllRepos();

    const repoNames = repos.map(repo => repo.repoURL);

    return repoNames;
}

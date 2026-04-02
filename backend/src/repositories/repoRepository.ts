import { Repo } from '../database/models/index.js';

export async function createRepo(data: { repoURL: string; latestSHA?: string }) {
    return await Repo.create(data);
}

export async function findRepoByURL(repoURL: string) {
    return await Repo.findOne({ repoURL });
}

export async function deleteRepoByURL(repoURL: string) {
    return await Repo.deleteOne({ repoURL });
}

export async function getAllRepos() {
    return await Repo.find({});
}

export async function updateLastAccessed(repoURL: string) {
    const lastAccessed = new Date();
    return await Repo.findOneAndReplace({ repoURL }, { lastAccessed }, { returnDocument: 'after' });
}

export async function updateLatestSHA(repoURL: string, latestSHA: string) {
    return await Repo.findOneAndReplace({ repoURL }, { latestSHA }, { returnDocument: 'after' });
}

export async function updateFileTree(repoURL: string, fileTree: object) {
    return await Repo.findOneAndReplace({ repoURL }, { fileTree }, { returnDocument: 'after' });
}

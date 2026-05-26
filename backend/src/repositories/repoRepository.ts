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

export async function getAllRepositories() {
    return await Repo.find({});
}

export async function updateLastAccessed(repoURL: string) {
    const lastAccessed = new Date();
    return await Repo.findOneAndUpdate(
        { repoURL },
        { $set: { lastAccessed } },
        { returnDocument: 'after' }
    );
}

export async function updateLatestSHA(repoURL: string, latestSHA: string) {
    return await Repo.findOneAndUpdate(
        { repoURL },
        { $set: { latestSHA } },
        { returnDocument: 'after' }
    );
}

export async function updateFileTree(repoURL: string, fileTree: object) {
    return await Repo.findOneAndUpdate(
        { repoURL },
        { $set: { fileTree } },
        { returnDocument: 'after' }
    );
}

export async function getOldestRepo() {
    return await Repo.findOne({}).sort({ lastAccessed: 1 }).lean();
}

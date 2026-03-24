import { Repo } from '../database/models/index.js';

export async function createRepo(data: { repoID: string; repoURL: string }) {
    return await Repo.create(data);
}

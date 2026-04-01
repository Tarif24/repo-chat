import { Repo } from '../database/models/index.js';

export async function createRepo(data: { repoURL: string }) {
    return await Repo.create(data);
}

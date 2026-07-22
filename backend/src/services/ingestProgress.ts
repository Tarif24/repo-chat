import {
    getIngestProgressStatus,
    deleteIngestProgress,
    createIngestProgress,
} from '../repositories/ingestProgressRepository.js';

export async function createRepoIngestStatus(repoURL: string) {
    return await createIngestProgress(repoURL);
}

export async function getRepoIngestStatus(repoURL: string) {
    const status = await getIngestProgressStatus(repoURL);

    return status;
}

export async function deleteRepoIngestStatus(repoURL: string) {
    await deleteIngestProgress(repoURL);
}

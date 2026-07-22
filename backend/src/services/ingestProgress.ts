import { getIngestProgressStatus } from '../repositories/ingestProgressRepository.js';

export async function getRepoIngestStatus(repoURL: string) {
    const status = await getIngestProgressStatus(repoURL);

    return status;
}

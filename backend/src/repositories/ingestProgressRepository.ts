import { IngestProgress } from '../database/models/index.js';

export async function createIngestProgress(repoURL: string) {
    const existing = await IngestProgress.findOne({ repoURL });
    if (existing) {
        throw new Error(`Ingest progress for repo ${repoURL} already exists.`);
    }

    return await IngestProgress.create({ repoURL });
}

export async function updateIngestProgressStatus(
    repoUrl: string,
    status: 'idle' | 'processing' | 'complete' | 'error',
    statusStage:
        | 'cloning'
        | 'scanning'
        | 'chunking'
        | 'embedding'
        | 'storing'
        | 'complete'
        | 'error',
    statusMessage: string,
    statusMeta: object = {}
) {
    return await IngestProgress.updateOne(
        { repoUrl },
        {
            $set: {
                status,
                statusStage,
                statusMessage,
                statusMeta,
                statusUpdatedAt: new Date(),
            },
        },
        { upsert: true }
    );
}

export async function getIngestProgressStatus(repoURL: string) {
    const repo = await IngestProgress.findOne(
        { repoURL },
        { status: 1, statusStage: 1, statusMessage: 1, statusMeta: 1, statusUpdatedAt: 1 }
    ).lean();

    if (!repo) return null;

    return {
        status: repo.status,
        statusStage: repo.statusStage,
        statusMessage: repo.statusMessage,
        statusMeta: repo.statusMeta,
        statusUpdatedAt: repo.statusUpdatedAt,
    };
}

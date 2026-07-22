import { IngestProgress } from '../database/models/index.js';

export async function createIngestProgress(repoURL: string) {
    const existing = await IngestProgress.findOne({ repoURL });
    if (existing) {
        return existing;
    }

    return await IngestProgress.create({ repoURL });
}

export async function deleteIngestProgress(repoURL: string) {
    return await IngestProgress.deleteOne({ repoURL });
}

export async function updateIngestProgressStatus(
    repoURL: string,
    status: 'idle' | 'processing' | 'complete' | 'error',
    statusStage:
        | 'cloning'
        | 'scanning'
        | 'storageCheck'
        | 'chunking'
        | 'embeddingAndProcessing'
        | 'complete'
        | 'error',
    statusMessage: string,
    statusMeta: object = {}
) {
    // Ensure the doc exists first so $pull/$push below don't race with upsert semantics
    await IngestProgress.updateOne({ repoURL }, { $setOnInsert: { repoURL } }, { upsert: true });

    // Remove any existing history entry for this stage
    await IngestProgress.updateOne({ repoURL }, { $pull: { statusHistory: { statusStage } } });

    // Push the new entry for this stage
    await IngestProgress.updateOne(
        { repoURL },
        {
            $push: {
                statusHistory: { statusStage, statusMessage, statusMeta },
            },
        }
    );

    return await IngestProgress.updateOne(
        { repoURL },
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
        {
            status: 1,
            statusStage: 1,
            statusMessage: 1,
            statusMeta: 1,
            statusUpdatedAt: 1,
            statusHistory: 1,
        }
    ).lean();

    if (!repo) {
        return null;
    }

    return {
        status: repo.status,
        statusStage: repo.statusStage,
        statusMessage: repo.statusMessage,
        statusMeta: repo.statusMeta,
        statusHistory: repo.statusHistory,
        statusUpdatedAt: repo.statusUpdatedAt,
    };
}

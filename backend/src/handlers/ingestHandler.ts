import type { Request, Response } from 'express';
import { ingest, getIngestStatus, repoCleanup } from '../controllers/ingestController.js';

export async function handleIngestRepo(req: Request, res: Response): Promise<void> {
    const { repoURL } = req.body;

    // Fire off ingestion in background — await is used only for initialization but not for the entire ingestion pipeline
    await ingest(repoURL);

    res.standardResponse(202, { repoURL }, 'Ingestion started');
}

export async function handleGetIngestStatus(req: Request, res: Response) {
    const { repoURL } = req.body;

    const status = await getIngestStatus(repoURL);

    if (!status) {
        res.standardResponse(200, null, 'No ingestion status found for this repository');
        return;
    }

    res.standardResponse(200, status, 'Ingestion status retrieved');
}

export async function handleTestCleanup(req: Request, res: Response) {
    if (process.env.NODE_ENV === 'production') {
        return res.standardResponse(200, null, 'Test routes are disabled in production');
    }

    const { repoURL } = req.query;

    if (typeof repoURL !== 'string' || repoURL.length === 0) {
        return res.standardResponse(400, null, 'repoUrl query param is required');
    }

    await repoCleanup(repoURL);

    res.standardResponse(200, { repoURL }, 'Test data cleaned up');
}

import type { Request, Response } from 'express';
import { ingest, getIngestStatus } from '../controllers/ingestController.js';

export async function handleIngestRepo(req: Request, res: Response): Promise<void> {
    const { repoURL } = req.body;

    // Fire off ingestion in background — do not await
    ingest(repoURL);

    res.standardResponse(202, { repoURL }, 'Ingestion started');
}

export async function handleGetIngestStatus(req: Request, res: Response) {
    const { repoUrl } = req.query as { repoUrl: string };

    const status = await getIngestStatus(repoUrl);

    if (!status) {
        res.standardResponse(404, null, 'No ingestion status found for this repository');
        return;
    }

    res.standardResponse(200, status, 'Ingestion status retrieved');
}

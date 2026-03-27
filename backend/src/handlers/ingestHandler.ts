import type { Request, Response } from 'express';
import { ingestRepo } from '../controllers/ingestController.js';

export async function handleIngestRepo(req: Request, res: Response) {
    console.log(req.body);
    await ingestRepo(req.body.repoUrl);
    res.standardResponse(200, null, 'Repository ingestion started');
}

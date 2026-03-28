import type { Request, Response } from 'express';
import { ingestRepo } from '../controllers/ingestController.js';

export async function handleIngestRepo(req: Request, res: Response) {
    const response = await ingestRepo(req.body.repoUrl);
    res.standardResponse(200, response, 'Repository ingestion started');
}

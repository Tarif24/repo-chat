import type { Request, Response } from 'express';
import { ingestRepo } from '../controllers/ingestController.js';

export async function handleIngestRepo(req: Request, res: Response) {
    console.log(req.body);
    await ingestRepo(req.body.repoUrl);
    res.send('Hello World from TypeScript!');
}

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { registerJob, removeJob } from '../lib/jobRegistry.js';
import { ingest } from '../controllers/ingestController.js';

export async function handleIngestRepo(req: Request, res: Response): Promise<void> {
    const { repoUrl } = req.body;

    const jobId = uuidv4();

    // Fire off ingestion in background — do not await
    ingest(jobId, repoUrl);

    res.standardResponse(200, { jobId }, 'Ingestion started');
}

export async function handleIngestProgress(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== 'string') {
        res.standardResponse(400, null, 'Missing jobId parameter');
        return;
    }

    // Set SSE headers to keep the connection open and stream events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // senderFn is stored in the registry so ingestService can call it
    const senderFn = (event: string, data: object) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    registerJob(jobId, senderFn);

    // Keep connection alive on AWS ALB — comment lines are ignored by EventSource
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    // Clean up when client disconnects
    req.on('close', () => {
        clearInterval(heartbeat);
        removeJob(jobId);
        res.end();
    });
}

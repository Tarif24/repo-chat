import express from 'express';
import {
    handleIngestRepo,
    handleGetIngestStatus,
    handleTestCleanup,
} from '../handlers/ingestHandler.js';
import { validate } from '../middleware/validate.js';
import { ingestRepoSchema } from '../schemas/ingest.schema.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

// Crete a new express router that will handle all routes related to ingesting data (Requests to /api/ingest/* will be handled by this router)
const ingest = express.Router();

ingest.post('/repo', strictLimiter, validate(ingestRepoSchema), handleIngestRepo);

ingest.post('/status', validate(ingestRepoSchema), handleGetIngestStatus);

ingest.delete('/delete/repo', handleTestCleanup);

export default ingest;

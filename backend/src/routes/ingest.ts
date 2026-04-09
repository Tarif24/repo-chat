import express from 'express';
import { handleIngestRepo } from '../handlers/ingestHandler.js';
import { validate } from '../middleware/validate.js';
import { ingestRepoSchema } from '../schemas/ingest.schema.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

// Crete a new express router that will handle all routes related to ingesting data (Requests to /api/ingest/* will be handled by this router)
const ingest = express.Router();

ingest.post('/repo', strictLimiter, validate(ingestRepoSchema), handleIngestRepo);

export default ingest;

import express from 'express';

// Crete a new express router that will handle all routes related to system health (Requests to /api/health/* will be handled by this router)
const health = express.Router();

health.get('/check', (_req, res) => {
    res.standardResponse(
        200,
        { status: 'ok', uptime: process.uptime() },
        'Health check successful'
    );
});

export default health;

import express from 'express';

// Crete a new express router that will handle all routes related to system health (Requests to /api/health/* will be handled by this router)
const health = express.Router();

health.post('/check', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

export default health;

import express from 'express';

// Crete a new express router that will handle all routes related to ingesting data (Requests to /api/ingest/* will be handled by this router)
const ingest = express.Router();

ingest.get('/', (req, res) => {
  req.body;
  res.send('Hello World from TypeScript!');
});

export default ingest;

import express from 'express';

// Create a new express router that will handle all routes related to querying data (Requests to /api/query/* will be handled by this router)
const query = express.Router();

export default query;

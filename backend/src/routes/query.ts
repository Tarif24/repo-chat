import express from 'express';
import { handleGetAllRepos, handleUserQuery } from '../handlers/queryHandler.js';
import { validate } from '../middleware/validate.js';
import { userQuerySchema } from '../schemas/query.schema.js';

// Create a new express router that will handle all routes related to querying data (Requests to /api/query/* will be handled by this router)
const query = express.Router();

query.post('/userQuery', validate(userQuerySchema), handleUserQuery);
query.get('/getAllRepos', handleGetAllRepos);

export default query;

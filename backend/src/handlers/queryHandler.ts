import type { Request, Response } from 'express';
import { getAllRepositories, userQuery } from '../controllers/queryController.js';

export async function handleUserQuery(req: Request, res: Response) {
    const queryResponse = await userQuery(req.body.query, req.body.repoUrl);
    res.standardResponse(200, { queryResponse }, 'Query processed successfully');
}

export async function handleGetAllRepos(_req: Request, res: Response) {
    const allRepos = await getAllRepositories();
    res.standardResponse(200, { repos: allRepos }, 'All repositories retrieved successfully');
}

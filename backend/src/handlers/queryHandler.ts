import type { Request, Response } from 'express';
import {
    getAllRepositories,
    userQuery,
    getRepositoryByURL,
} from '../controllers/queryController.js';

export async function handleUserQuery(req: Request, res: Response) {
    const queryResponse = await userQuery(req.body.query, req.body.repoUrl, req.body.chatHistory);
    res.standardResponse(200, { queryResponse }, 'Query processed successfully');
}

export async function handleGetAllRepos(_req: Request, res: Response) {
    const allRepos = await getAllRepositories();
    res.standardResponse(200, { repos: allRepos }, 'All repositories retrieved successfully');
}

export async function handleGetRepoByURL(req: Request, res: Response) {
    const repo = await getRepositoryByURL(req.body.repoUrl);
    res.standardResponse(200, { repo: repo }, 'Repository retrieved successfully');
}

jest.mock('../../src/controllers/queryController.js', () => ({
    getAllRepositories: jest.fn(),
    userQuery: jest.fn(),
    getRepositoryByURL: jest.fn(),
}));

import type { Request, Response } from 'express';
import {
    getAllRepositories,
    userQuery,
    getRepositoryByURL,
} from '../../src/controllers/queryController.js';
import {
    handleGetAllRepos,
    handleGetRepoByURL,
    handleUserQuery,
} from '../../src/handlers/queryHandler.js';

const mockGetAllRepositories = getAllRepositories as jest.Mock;
const mockUserQuery = userQuery as jest.Mock;
const mockGetRepositoryByURL = getRepositoryByURL as jest.Mock;

describe('query handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // This checks that the user-query handler forwards the request data to the controller and sends the controller result back to the client.
    it('forwards a user query to the controller and sends the response payload', async () => {
        const queryResponse = { message: 'answer', contextStats: { totalChars: 10 } };
        mockUserQuery.mockResolvedValueOnce(queryResponse);

        const req = {
            body: {
                query: 'How does auth work?',
                repoURL: 'https://example.com/repo',
                chatHistory: [{ role: 'user', content: 'hello' }],
            },
        } as unknown as Request;
        const res = {
            standardResponse: jest.fn(),
        } as unknown as Response;
        const standardResponse = (res as unknown as { standardResponse: jest.Mock })
            .standardResponse;

        await handleUserQuery(req, res);

        expect(mockUserQuery).toHaveBeenCalledTimes(1);
        expect(mockUserQuery).toHaveBeenCalledWith(
            'How does auth work?',
            'https://example.com/repo',
            [{ role: 'user', content: 'hello' }]
        );
        expect(standardResponse).toHaveBeenCalledTimes(1);
        expect(standardResponse).toHaveBeenCalledWith(
            200,
            queryResponse,
            'Query processed successfully'
        );
    });

    // This checks that the repository-list handler asks the controller for all repositories and wraps them in the expected response shape.
    it('retrieves all repositories from the controller and sends them in a standard response', async () => {
        const repos = ['https://example.com/repo-one', 'https://example.com/repo-two'];
        mockGetAllRepositories.mockResolvedValueOnce(repos);

        const req = {} as Request;
        const res = {
            standardResponse: jest.fn(),
        } as unknown as Response;
        const standardResponse = (res as unknown as { standardResponse: jest.Mock })
            .standardResponse;

        await handleGetAllRepos(req, res);

        expect(mockGetAllRepositories).toHaveBeenCalledTimes(1);
        expect(standardResponse).toHaveBeenCalledTimes(1);
        expect(standardResponse).toHaveBeenCalledWith(
            200,
            { repos },
            'All repositories retrieved successfully'
        );
    });

    // This checks that the single-repository handler passes the repository URL through and sends the returned repository in the expected shape.
    it('retrieves one repository by URL from the controller and sends it in a standard response', async () => {
        const repo = { repoURL: 'https://example.com/repo' };
        mockGetRepositoryByURL.mockResolvedValueOnce(repo);

        const req = {
            body: { repoURL: 'https://example.com/repo' },
        } as unknown as Request;
        const res = {
            standardResponse: jest.fn(),
        } as unknown as Response;
        const standardResponse = (res as unknown as { standardResponse: jest.Mock })
            .standardResponse;

        await handleGetRepoByURL(req, res);

        expect(mockGetRepositoryByURL).toHaveBeenCalledTimes(1);
        expect(mockGetRepositoryByURL).toHaveBeenCalledWith('https://example.com/repo');
        expect(standardResponse).toHaveBeenCalledTimes(1);
        expect(standardResponse).toHaveBeenCalledWith(
            200,
            { repo },
            'Repository retrieved successfully'
        );
    });
});

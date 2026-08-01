jest.mock('../../src/controllers/ingestController.js', () => ({
    ingest: jest.fn(),
    getIngestStatus: jest.fn(),
}));

import type { Request, Response } from 'express';
import { ingest, getIngestStatus } from '../../src/controllers/ingestController.js';
import { handleGetIngestStatus, handleIngestRepo } from '../../src/handlers/ingestHandler.js';

const mockIngest = ingest as jest.Mock;
const mockGetIngestStatus = getIngestStatus as jest.Mock;

describe('ingest handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // This checks that the handler forwards the repo URL to the ingest controller and sends the expected 202 response.
    it('starts ingestion and sends the expected 202 response', async () => {
        mockIngest.mockResolvedValueOnce(undefined);

        const req = {
            body: { repoURL: 'https://example.com/repo' },
        } as unknown as Request;
        const res = {
            standardResponse: jest.fn(),
        } as unknown as Response;
        const standardResponse = (res as unknown as { standardResponse: jest.Mock })
            .standardResponse;

        await handleIngestRepo(req, res);

        expect(mockIngest).toHaveBeenCalledTimes(1);
        expect(mockIngest).toHaveBeenCalledWith('https://example.com/repo');
        expect(standardResponse).toHaveBeenCalledTimes(1);
        expect(standardResponse).toHaveBeenCalledWith(
            202,
            { repoURL: 'https://example.com/repo' },
            'Ingestion started'
        );
    });

    // This checks that the handler returns the status payload with a 200 response when the controller returns a status object.
    it('returns the ingest status with a 200 response when a status exists', async () => {
        const status = { status: 'processing', statusStage: 'cloning' };
        mockGetIngestStatus.mockResolvedValueOnce(status);

        const req = {
            body: { repoURL: 'https://example.com/repo' },
        } as unknown as Request;
        const res = {
            standardResponse: jest.fn(),
        } as unknown as Response;
        const standardResponse = (res as unknown as { standardResponse: jest.Mock })
            .standardResponse;

        await handleGetIngestStatus(req, res);

        expect(mockGetIngestStatus).toHaveBeenCalledTimes(1);
        expect(mockGetIngestStatus).toHaveBeenCalledWith('https://example.com/repo');
        expect(standardResponse).toHaveBeenCalledTimes(1);
        expect(standardResponse).toHaveBeenCalledWith(200, status, 'Ingestion status retrieved');
    });

    // This checks that the handler sends a 404 response when the controller returns no status for the repo.
    it('sends a 200 response when no ingest status exists with null body', async () => {
        mockGetIngestStatus.mockResolvedValueOnce(undefined);

        const req = {
            body: { repoURL: 'https://example.com/repo' },
        } as unknown as Request;
        const res = {
            standardResponse: jest.fn(),
        } as unknown as Response;
        const standardResponse = (res as unknown as { standardResponse: jest.Mock })
            .standardResponse;

        await handleGetIngestStatus(req, res);

        expect(mockGetIngestStatus).toHaveBeenCalledTimes(1);
        expect(mockGetIngestStatus).toHaveBeenCalledWith('https://example.com/repo');
        expect(standardResponse).toHaveBeenCalledTimes(1);
        expect(standardResponse).toHaveBeenCalledWith(
            200,
            null,
            'No ingestion status found for this repository'
        );
    });
});

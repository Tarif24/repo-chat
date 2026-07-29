import { IngestProgress } from '../../src/database/models/index.js';
import {
    createRepoIngestStatus,
    getRepoIngestStatus,
    deleteRepoIngestStatus,
} from '../../src/services/ingestProgress.js';
import {
    updateIngestProgressStatus,
    getIngestProgressStatus,
} from '../../src/repositories/ingestProgressRepository.js';

describe('ingest progress integration', () => {
    // checks that a complete sequence of stage updates produces one history entry per stage in visit order
    it('records one history entry per stage and keeps them in stage order', async () => {
        const repoURL = 'https://example.com/repo.git';

        await updateIngestProgressStatus(repoURL, 'processing', 'cloning', 'Cloning repository...');
        await updateIngestProgressStatus(repoURL, 'processing', 'scanning', 'Scanning files...');
        await updateIngestProgressStatus(
            repoURL,
            'processing',
            'storageCheck',
            'Checking storage...'
        );
        await updateIngestProgressStatus(repoURL, 'processing', 'chunking', 'Chunking files...');
        await updateIngestProgressStatus(
            repoURL,
            'processing',
            'embeddingAndProcessing',
            'Embedding and processing chunks...'
        );
        await updateIngestProgressStatus(
            repoURL,
            'complete',
            'complete',
            'Repository ingested successfully'
        );

        const status = await getIngestProgressStatus(repoURL);

        expect(status?.status).toBe('complete');
        expect(status?.statusStage).toBe('complete');
        expect(status?.statusHistory.map(entry => entry.statusStage)).toEqual([
            'cloning',
            'scanning',
            'storageCheck',
            'chunking',
            'embeddingAndProcessing',
            'complete',
        ]);
        expect([
            ...new Set(status?.statusHistory.map(entry => entry.statusStage) ?? []),
        ]).toHaveLength(6);
    });

    // checks that updating the same stage twice replaces the existing history entry instead of creating a duplicate
    it('replaces the existing history entry when the same stage is updated twice', async () => {
        const repoURL = 'https://example.com/repo.git';

        await updateIngestProgressStatus(repoURL, 'processing', 'cloning', 'Cloning repository...');
        await updateIngestProgressStatus(
            repoURL,
            'processing',
            'cloning',
            'Cloning repository (retry)...'
        );

        const status = await getIngestProgressStatus(repoURL);
        const cloningEntries =
            status?.statusHistory.filter(entry => entry.statusStage === 'cloning') ?? [];

        expect(cloningEntries).toHaveLength(1);
        expect(cloningEntries[0]).toMatchObject({
            statusStage: 'cloning',
            statusMessage: 'Cloning repository (retry)...',
        });
    });

    // checks that a terminal error write leaves the document in an error state with one error history entry
    it('stores a single error history entry for a terminal failure', async () => {
        const repoURL = 'https://example.com/repo.git';

        await updateIngestProgressStatus(repoURL, 'processing', 'cloning', 'Cloning repository...');
        await updateIngestProgressStatus(repoURL, 'error', 'error', 'Ingestion error: boom', {
            success: false,
        });

        const status = await getIngestProgressStatus(repoURL);
        const errorEntries =
            status?.statusHistory.filter(entry => entry.statusStage === 'error') ?? [];

        expect(status?.status).toBe('error');
        expect(status?.statusStage).toBe('error');
        expect(errorEntries).toHaveLength(1);
        expect(errorEntries[0]).toMatchObject({
            statusStage: 'error',
            statusMessage: 'Ingestion error: boom',
            statusMeta: { success: false },
        });
    });

    // checks that a status read during progress returns the latest write at that point in the sequence
    it('returns the latest status snapshot when read mid-sequence', async () => {
        const repoURL = 'https://example.com/repo.git';

        await updateIngestProgressStatus(repoURL, 'processing', 'cloning', 'Cloning repository...');

        let status = await getIngestProgressStatus(repoURL);
        expect(status).toMatchObject({
            status: 'processing',
            statusStage: 'cloning',
            statusMessage: 'Cloning repository...',
        });

        await updateIngestProgressStatus(repoURL, 'processing', 'scanning', 'Scanning files...');

        status = await getIngestProgressStatus(repoURL);
        expect(status).toMatchObject({
            status: 'processing',
            statusStage: 'scanning',
            statusMessage: 'Scanning files...',
        });
    });

    // checks that deleting the progress record removes the real document from the database
    it('removes the real ingest progress document from the database', async () => {
        const repoURL = 'https://example.com/repo.git';

        await createRepoIngestStatus(repoURL);
        await updateIngestProgressStatus(repoURL, 'processing', 'cloning', 'Cloning repository...');

        expect(await getRepoIngestStatus(repoURL)).not.toBeNull();

        await deleteRepoIngestStatus(repoURL);

        expect(await getRepoIngestStatus(repoURL)).toBeNull();
        expect(await IngestProgress.findOne({ repoURL })).toBeNull();
    });
});

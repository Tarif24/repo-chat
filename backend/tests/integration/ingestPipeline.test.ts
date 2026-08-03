import * as fs from 'fs';
import * as path from 'path';
import { appConfig, dbConfig, openAIConfig } from '../../src/config/config.js';

jest.mock('../../src/config/config.js', () => ({
    appConfig: {
        repoStoragePath: appConfig.repoStoragePath || path.join(process.cwd(), 'repoCloning'),
    },
    dbConfig: {
        mongoUrl:
            dbConfig.mongoUrl || process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/test',
    },
    openAIConfig: {
        apiKey: 'test-openai-key',
        chatModel: 'gpt-4o-mini',
        embeddingModel: 'text-embedding-3-small',
    },
}));

jest.mock('../../src/services/gitHub.js', () => ({
    cloneAndGetSha: jest.fn(),
    getLatestSha: jest.fn(),
}));

jest.mock('../../src/providers/embeddingProvider.js', () => ({
    createEmbedding: jest.fn(),
}));

process.env.OPENAI_API_KEY = openAIConfig.apiKey || 'test-openai-key';
process.env.OPENAI_CHAT_MODEL = openAIConfig.chatModel || 'gpt-4o-mini';
process.env.OPENAI_EMBEDDING_MODEL = openAIConfig.embeddingModel || 'text-embedding-3-small';
process.env.MONGO_URL =
    dbConfig.mongoUrl || process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/test';
process.env.REPO_STORAGE_PATH =
    appConfig.repoStoragePath || path.join(process.cwd(), 'repoCloning');

import { cloneAndGetSha, getLatestSha } from '../../src/services/gitHub.js';
import { createEmbedding } from '../../src/providers/embeddingProvider.js';

const mockCloneAndGetSha = cloneAndGetSha as jest.Mock;
const mockGetLatestSha = getLatestSha as jest.Mock;
const mockCreateEmbedding = createEmbedding as jest.Mock;

let ingestRepo: (repoURL: string) => Promise<void>;
let Repo: typeof import('../../src/database/models/Repo.js').default;
let Chunk: typeof import('../../src/database/models/Chunk.js').default;
let getIngestProgressStatus: typeof import('../../src/repositories/ingestProgressRepository.js').getIngestProgressStatus;

const fixtureRepoURL = 'https://github.com/Tarif24/Tarif24';
const fixtureStoragePath = appConfig.repoStoragePath as string;

function writeFixtureFiles(version: 'initial' | 'updated' = 'initial') {
    fs.rmSync(fixtureStoragePath, { recursive: true, force: true });
    fs.mkdirSync(fixtureStoragePath, { recursive: true });

    const files: Array<{ relativePath: string; content: string }> = [
        {
            relativePath: 'src/index.ts',
            content:
                version === 'updated'
                    ? `export function greetUpdated(name: string) {\n  return "hello " + name;\n}`
                    : `export function greet(name: string) {\n  return "hello " + name;\n}`,
        },
        {
            relativePath: 'src/utils.ts',
            content:
                version === 'updated'
                    ? `export const answer = 43;\nexport function getAnswer() { return answer; }`
                    : `export const answer = 42;\nexport function getAnswer() { return answer; }`,
        },
        {
            relativePath: 'README.md',
            content: '# Tarif24\n\nThis repo contains a minimal demo surface.',
        },
    ];

    for (const file of files) {
        const absolutePath = path.join(fixtureStoragePath, file.relativePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, file.content);
    }
}

describe('ingest pipeline integration', () => {
    beforeAll(async () => {
        jest.setTimeout(120_000);

        ({ ingestRepo } = await import('../../src/services/ingest.js'));
        ({ default: Repo } = await import('../../src/database/models/Repo.js'));
        ({ default: Chunk } = await import('../../src/database/models/Chunk.js'));
        ({ getIngestProgressStatus } =
            await import('../../src/repositories/ingestProgressRepository.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        writeFixtureFiles('initial');
        mockCreateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        mockCloneAndGetSha.mockImplementation(async () => {
            writeFixtureFiles('initial');
            return 'sha-initial';
        });
        mockGetLatestSha.mockResolvedValue('sha-initial');
    });

    it('creates a real repo document and chunk documents from fixture files', async () => {
        await ingestRepo(fixtureRepoURL);

        const repo = await Repo.findOne({ repoURL: fixtureRepoURL });
        const chunks = await Chunk.find({ 'metadata.repoURL': fixtureRepoURL }).lean();
        const progress = await getIngestProgressStatus(fixtureRepoURL);

        expect(repo).toMatchObject({
            repoURL: fixtureRepoURL,
            latestSHA: 'sha-initial',
        });
        expect(chunks.length).toBeGreaterThan(0);
        expect(
            chunks.some(chunk => chunk.metadata.relativePath?.replace(/\\/g, '/')?.includes('src/'))
        ).toBe(true);
        expect(chunks.some(chunk => chunk.metadata.language === 'typescript')).toBe(true);
        expect(chunks.some(chunk => chunk.content.includes('greet'))).toBe(true);
        expect(
            chunks.some(
                chunk => chunk.metadata.language === 'markdown' && chunk.content.includes('Tarif24')
            )
        ).toBe(true);
        expect(progress?.status).toBe('complete');
        expect(progress?.statusStage).toBe('complete');
    });

    it('records the real ingestion progress sequence in order', async () => {
        await ingestRepo(fixtureRepoURL);

        const progress = await getIngestProgressStatus(fixtureRepoURL);

        expect(progress?.statusHistory.map(entry => entry.statusStage)).toEqual([
            'cloning',
            'scanning',
            'storageCheck',
            'chunking',
            'embeddingAndProcessing',
            'complete',
        ]);
        expect(progress?.statusMessage).toContain('successfully');
    });

    it('does not create duplicate chunks on a same-sha re-ingest and reprocesses on a new sha', async () => {
        await ingestRepo(fixtureRepoURL);

        const initialChunkCount = await Chunk.countDocuments({
            'metadata.repoURL': fixtureRepoURL,
        });
        const initialRepo = await Repo.findOne({ repoURL: fixtureRepoURL });

        mockGetLatestSha.mockResolvedValue('sha-initial');
        await ingestRepo(fixtureRepoURL);

        const sameShaChunkCount = await Chunk.countDocuments({
            'metadata.repoURL': fixtureRepoURL,
        });
        const sameShaRepo = await Repo.findOne({ repoURL: fixtureRepoURL });

        expect(sameShaChunkCount).toBe(initialChunkCount);
        expect(sameShaRepo?.latestSHA).toBe(initialRepo?.latestSHA);

        mockCloneAndGetSha.mockImplementation(async () => {
            writeFixtureFiles('updated');
            return 'sha-updated';
        });
        mockGetLatestSha.mockResolvedValue('sha-updated');

        await ingestRepo(fixtureRepoURL);

        const updatedChunks = await Chunk.find({ 'metadata.repoURL': fixtureRepoURL }).lean();
        const updatedRepo = await Repo.findOne({ repoURL: fixtureRepoURL });

        expect(updatedRepo?.latestSHA).toBe('sha-updated');
        expect(updatedChunks.length).toBeGreaterThan(0);
        expect(updatedChunks.some(chunk => chunk.content.includes('greetUpdated'))).toBe(true);
    });
});

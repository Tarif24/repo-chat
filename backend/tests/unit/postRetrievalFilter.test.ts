jest.mock('../../src/lib/logger.js', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
    },
}));

import type { ScoredChunk } from '../../src/repositories/chunkRepository.js';
import logger from '../../src/lib/logger.js';
import { applyPostRetrievalFilters } from '../../src/services/postRetrievalFilter.js';

const mockLoggerInfo = logger.info as jest.Mock;

function buildChunk(
    relativePath: string,
    score: number,
    parentDir = 'src/services',
    startLine = 1,
    endLine = 20
): ScoredChunk {
    return {
        score,
        metadata: {
            relativePath,
            parentDir,
            startLine,
            endLine,
        },
    } as ScoredChunk;
}

describe('applyPostRetrievalFilters', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // This checks that low-scoring chunks are removed before any later filtering logic runs.
    it('drops chunks that fall below the score threshold', () => {
        const chunks = [
            buildChunk('src/services/auth.ts', 0.95),
            buildChunk('src/services/user.ts', 0.7),
        ];

        const result = applyPostRetrievalFilters(chunks, 'How does auth work?', {
            scoreThreshold: 0.8,
        });

        expect(result.map(chunk => chunk.metadata.relativePath)).toEqual(['src/services/auth.ts']);
    });

    // This checks that the directory filter narrows the result set and overlapping chunks from the same file are removed.
    it('filters by directory and removes overlapping chunks from the same file', () => {
        const chunks = [
            buildChunk('src/services/auth.ts', 0.95, 'src/services', 1, 10),
            buildChunk('src/services/auth.ts', 0.9, 'src/services', 3, 12),
            buildChunk('src/services/other.ts', 0.89, 'src/services', 1, 6),
            buildChunk('src/models/user.ts', 0.88, 'src/models', 1, 6),
        ];

        const result = applyPostRetrievalFilters(chunks, 'How does auth work?', {
            directory: 'services',
        });

        expect(result.map(chunk => chunk.metadata.relativePath)).toEqual([
            'src/services/auth.ts',
            'src/services/other.ts',
        ]);
    });

    // This checks that documentation and entrypoint files are removed when the question is not about documentation.
    it('removes noise files such as README and entrypoint files from the result set', () => {
        const chunks = [
            buildChunk('README.md', 0.92, 'docs', 1, 10),
            buildChunk('src/services/auth.ts', 0.91, 'src/services', 1, 10),
        ];

        const result = applyPostRetrievalFilters(chunks, 'How does the API authenticate requests?');

        expect(result.map(chunk => chunk.metadata.relativePath)).toEqual(['src/services/auth.ts']);
    });

    // This checks that the per-file cap is applied when one file dominates the filtered result set.
    it('applies the per-file cap when one file makes up most of the result set', () => {
        const chunks = [
            buildChunk('src/services/auth.ts', 0.95, 'src/services', 1, 4),
            buildChunk('src/services/auth.ts', 0.94, 'src/services', 5, 8),
            buildChunk('src/services/auth.ts', 0.93, 'src/services', 9, 12),
            buildChunk('src/services/user.ts', 0.92, 'src/services', 1, 4),
            buildChunk('src/services/role.ts', 0.91, 'src/services', 1, 4),
        ];

        const result = applyPostRetrievalFilters(chunks, 'How does auth work?', {
            maxPerFile: 3,
            maxPerFileDiverse: 2,
            dominantDiversityFilePctThreshold: 40,
        });

        expect(result.map(chunk => chunk.metadata.relativePath)).toEqual([
            'src/services/auth.ts',
            'src/services/auth.ts',
            'src/services/user.ts',
            'src/services/role.ts',
        ]);
    });

    // This checks that the service still logs its progress through the filtering stages.
    it('logs the filtering stages while processing the chunk list', () => {
        const chunks = [buildChunk('src/services/auth.ts', 0.95)];

        applyPostRetrievalFilters(chunks, 'How does auth work?');

        expect(mockLoggerInfo).toHaveBeenCalled();
    });
});

jest.mock('../../src/providers/completionProvider.js', () => ({
    interpretQuery: jest.fn(),
}));

jest.mock('../../src/providers/embeddingProvider.js', () => ({
    createEmbedding: jest.fn(),
}));

import { interpretQuery } from '../../src/providers/completionProvider.js';
import { createEmbedding } from '../../src/providers/embeddingProvider.js';
import { interpretAndEmbedQuery } from '../../src/services/queryInterpreter.js';

const mockInterpretQuery = interpretQuery as jest.Mock;
const mockCreateEmbedding = createEmbedding as jest.Mock;

describe('queryInterpreter — interpretAndEmbedQuery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls interpretQuery with the user question before embedding anything', async () => {
        mockInterpretQuery.mockResolvedValueOnce({
            hypotheticalChunk: 'a hypothetical chunk',
            filters: { language: 'typescript', directory: 'services' },
        });
        mockCreateEmbedding.mockResolvedValueOnce([0.1, 0.2, 0.3]);

        await interpretAndEmbedQuery('how does auth work');

        expect(mockInterpretQuery).toHaveBeenCalledTimes(1);
        expect(mockInterpretQuery).toHaveBeenCalledWith('how does auth work');

        const interpretOrder = mockInterpretQuery.mock.invocationCallOrder[0];
        const embeddingOrder = mockCreateEmbedding.mock.invocationCallOrder[0];

        expect(interpretOrder).toBeDefined();
        expect(embeddingOrder).toBeDefined();

        if (interpretOrder !== undefined && embeddingOrder !== undefined) {
            expect(interpretOrder).toBeLessThan(embeddingOrder);
        }
    });

    it('returns the embedding plus the filters and hypothetical chunk from the provider results', async () => {
        mockInterpretQuery.mockResolvedValueOnce({
            hypotheticalChunk: 'a hypothetical chunk',
            filters: { language: 'typescript', directory: 'services' },
        });
        mockCreateEmbedding.mockResolvedValueOnce([0.1, 0.2, 0.3]);

        const result = await interpretAndEmbedQuery('how does auth work');

        expect(result).toEqual({
            embedding: [0.1, 0.2, 0.3],
            filters: { language: 'typescript', directory: 'services' },
            hypotheticalChunk: 'a hypothetical chunk',
        });
        expect(mockCreateEmbedding).toHaveBeenCalledWith('a hypothetical chunk');
    });

    it('propagates an error from interpretQuery without wrapping it', async () => {
        mockInterpretQuery.mockRejectedValueOnce(new Error('interpret failed'));

        await expect(interpretAndEmbedQuery('how does auth work')).rejects.toThrow(
            'interpret failed'
        );
    });

    it('propagates an error from createEmbedding without wrapping it', async () => {
        mockInterpretQuery.mockResolvedValueOnce({
            hypotheticalChunk: 'a hypothetical chunk',
            filters: { language: 'typescript' },
        });
        mockCreateEmbedding.mockRejectedValueOnce(new Error('embedding failed'));

        await expect(interpretAndEmbedQuery('how does auth work')).rejects.toThrow(
            'embedding failed'
        );
    });
});

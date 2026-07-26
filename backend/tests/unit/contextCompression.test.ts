jest.mock('../../src/providers/completionProvider.js', () => ({
    compressChunk: jest.fn(),
}));

import { compressChunk } from '../../src/providers/completionProvider.js';
import { compressContext } from '../../src/services/contextCompression.js';
import { makeRankedChunk } from '../fixtures/chunks.js';

const mockCompressChunk = compressChunk as jest.Mock;

describe('contextCompression — compressContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns each chunk unchanged with compression disabled when the total content stays under the threshold', async () => {
        const chunks = [
            makeRankedChunk({ content: 'short chunk one' }),
            makeRankedChunk({ content: 'short chunk two' }),
        ];

        const result = await compressContext('how does this work?', chunks, 1_000);

        expect(mockCompressChunk).not.toHaveBeenCalled();
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
            content: 'short chunk one',
            originalContent: 'short chunk one',
            compressed: false,
        });
        expect(result[1]).toMatchObject({
            content: 'short chunk two',
            originalContent: 'short chunk two',
            compressed: false,
        });
    });

    it('compresses every chunk when the total content exceeds the threshold', async () => {
        const chunks = [
            makeRankedChunk({ content: 'a'.repeat(6_000) }),
            makeRankedChunk({ content: 'b'.repeat(6_000) }),
        ];
        const firstCompressed = {
            ...chunks[0],
            originalContent: chunks[0]?.content,
            compressed: true,
            content: 'compressed-a',
        };
        const secondCompressed = {
            ...chunks[1],
            originalContent: chunks[1]?.content,
            compressed: true,
            content: 'compressed-b',
        };

        mockCompressChunk.mockResolvedValueOnce(firstCompressed);
        mockCompressChunk.mockResolvedValueOnce(secondCompressed);

        const result = await compressContext('how does this work?', chunks, 1_000);

        expect(mockCompressChunk).toHaveBeenCalledTimes(2);
        expect(mockCompressChunk).toHaveBeenNthCalledWith(1, 'how does this work?', chunks[0]);
        expect(mockCompressChunk).toHaveBeenNthCalledWith(2, 'how does this work?', chunks[1]);
        expect(result).toEqual([firstCompressed, secondCompressed]);
    });

    it('propagates an error from the compression provider instead of swallowing it', async () => {
        const chunks = [makeRankedChunk({ content: 'x'.repeat(12_000) })];
        mockCompressChunk.mockRejectedValueOnce(new Error('compression failed'));

        await expect(compressContext('how does this work?', chunks, 1_000)).rejects.toThrow(
            'compression failed'
        );
    });
});

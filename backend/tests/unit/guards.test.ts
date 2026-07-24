// Mock the whole completionProvider module
jest.mock('../../src/providers/completionProvider.js', () => ({
    checkQueryRelevance: jest.fn(),
}));

// Import the mock so we can control what it returns
import { checkQueryRelevance } from '../../src/providers/completionProvider.js';

// Import the function we're actually testing
import { isRelevant } from '../../src/services/guards.js';

// Cast to jest.Mock so TypeScript lets us call mock methods on it
const mockCheckQueryRelevance = checkQueryRelevance as jest.Mock;

describe('guards — isRelevant', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls checkQueryRelevance with the exact query it was given', async () => {
        mockCheckQueryRelevance.mockResolvedValueOnce({
            relevant: true,
            sanitizedQuery: 'how does auth work',
        });

        await isRelevant('how does auth work');

        expect(mockCheckQueryRelevance).toHaveBeenCalledTimes(1);
        expect(mockCheckQueryRelevance).toHaveBeenCalledWith('how does auth work');
    });

    it('returns the relevant result unchanged when the query is relevant', async () => {
        mockCheckQueryRelevance.mockResolvedValueOnce({
            relevant: true,
            sanitizedQuery: 'how does auth work',
        });

        const result = await isRelevant('how does auth work');

        expect(result).toEqual({
            relevant: true,
            sanitizedQuery: 'how does auth work',
        });
    });

    it('returns the irrelevant result unchanged when the query is irrelevant', async () => {
        mockCheckQueryRelevance.mockResolvedValueOnce({
            relevant: false,
            sanitizedQuery: null,
        });

        const result = await isRelevant('what is the capital of France');

        expect(result).toEqual({
            relevant: false,
            sanitizedQuery: null,
        });
    });

    it('propagates a thrown error instead of swallowing it', async () => {
        // isRelevant has no try/catch of its own, so if checkQueryRelevance
        // were to throw (it currently doesn't — it fails open internally),
        // isRelevant should NOT hide that error.
        mockCheckQueryRelevance.mockRejectedValueOnce(new Error('unexpected failure'));

        await expect(isRelevant('how does auth work')).rejects.toThrow('unexpected failure');
    });
});

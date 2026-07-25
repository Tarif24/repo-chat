jest.mock('../../src/providers/completionProvider.js', () => ({
    getOpenAIResponseWithChatHistory: jest.fn(),
}));

import { getOpenAIResponseWithChatHistory } from '../../src/providers/completionProvider.js';
import { processUserQuery } from '../../src/services/queryProcessor.js';

const mockGetOpenAIResponseWithChatHistory = getOpenAIResponseWithChatHistory as jest.Mock;

describe('queryProcessor — processUserQuery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // This checks that the service sends only the system prompt and the new user message when there is no prior chat history.
    it('builds a simple message list when no chat history is provided', async () => {
        const providerResponse = { role: 'assistant', content: 'Hello there' };
        mockGetOpenAIResponseWithChatHistory.mockResolvedValueOnce(providerResponse);

        const result = await processUserQuery('You are helpful', 'Hello?');

        expect(mockGetOpenAIResponseWithChatHistory).toHaveBeenCalledTimes(1);
        expect(mockGetOpenAIResponseWithChatHistory).toHaveBeenCalledWith([
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello?' },
        ]);
        expect(result).toEqual(providerResponse);
    });

    // This checks that the service preserves earlier chat turns and appends the new user message at the end.
    it('prepends the system prompt and appends the new user message when chat history exists', async () => {
        const providerResponse = { role: 'assistant', content: 'I remember that' };
        const chatHistory = [
            { role: 'user' as const, content: 'What is the repo?' },
            { role: 'assistant' as const, content: 'It is a project' },
        ];
        mockGetOpenAIResponseWithChatHistory.mockResolvedValueOnce(providerResponse);

        const result = await processUserQuery('You are helpful', 'What else?', chatHistory);

        expect(mockGetOpenAIResponseWithChatHistory).toHaveBeenCalledWith([
            { role: 'system', content: 'You are helpful' },
            ...chatHistory,
            { role: 'user', content: 'What else?' },
        ]);
        expect(result).toEqual(providerResponse);
    });

    // This checks that the service lets a provider error bubble up instead of hiding it.
    it('propagates provider errors without wrapping them', async () => {
        const error = new Error('provider failed');
        mockGetOpenAIResponseWithChatHistory.mockRejectedValueOnce(error);

        await expect(processUserQuery('You are helpful', 'Hello?')).rejects.toThrow('provider failed');
    });
});

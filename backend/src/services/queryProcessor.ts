import { getOpenAIResponseWithChatHistory } from '../providers/completionProvider.js';

export async function processUserQuery(
    systemPrompt: string,
    userMessage: string,
    chatHistory?: { role: 'user' | 'assistant' | 'system'; content: string }[]
) {
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = chatHistory
        ? [
              { role: 'system', content: systemPrompt },
              ...chatHistory,
              { role: 'user', content: userMessage },
          ]
        : [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
          ];

    const response = await getOpenAIResponseWithChatHistory(messages);
    return response;
}

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create an instance of the OpenAI class with the API key
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export async function getOpenAIResponse(
    message: string
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | undefined> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
        n: 1,
    });

    if (response.choices[0]?.message) {
        return response.choices[0].message;
    }

    return undefined;
}

export async function getOpenAIResponseWithChatHistory(
    chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | undefined> {
    const lastMessage: { role: 'user' | 'assistant'; content: string } | undefined =
        chatHistory[chatHistory.length - 1];

    if (!lastMessage) {
        return undefined;
    }

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [lastMessage, ...chatHistory],
        n: 1,
    });

    if (response.choices[0]?.message) {
        return response.choices[0].message;
    }

    return undefined;
}

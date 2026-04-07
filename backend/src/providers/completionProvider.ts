import { openAIConfig } from '../config/config.js';
import OpenAI from 'openai';
import { AppError } from '../error/appError.js';

const OPENAI_API_KEY = openAIConfig.apiKey;
const OPENAI_CHAT_MODEL = openAIConfig.chatModel;

// Create an instance of the OpenAI class with the API key
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export async function getOpenAIResponse(
    message: string
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | undefined> {
    const response = await openai.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        messages: [{ role: 'user', content: message }],
        n: 1,
    });

    if (response.choices[0]?.message) {
        return response.choices[0].message;
    }

    return undefined;
}

export async function getOpenAIResponseWithChatHistory(
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | undefined> {
    const lastMessage: { role: 'user' | 'assistant' | 'system'; content: string } | undefined =
        chatHistory[chatHistory.length - 1];

    if (!lastMessage) {
        return undefined;
    }

    const response = await openai.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        messages: [lastMessage, ...chatHistory],
        n: 1,
    });

    if (response.choices[0]?.message) {
        return response.choices[0].message;
    }

    return undefined;
}

export type QueryInterpretationType = {
    hypotheticalChunk: string;
    filters: {
        language?: string | undefined;
        directory?: string | undefined;
    };
};

// Takes in a user query and generates a embedding based on a hypothetical chunk and also returns the language and directory filters if mentioned in the query
export async function interpretQuery(question: string): Promise<QueryInterpretationType> {
    const response = await openai.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You analyze questions about a code repository. Return ONLY valid JSON with exactly two fields:

                "hypothetical_chunk": A 3-5 sentence description of the exact code that would answer this question. Write it as if describing real source code — use technical vocabulary, mention likely function names, variable names, patterns, or structures. This will be embedded for semantic search, so match the vocabulary the code would use.

                "filters": An object with optional fields:
                - "language": programming language (e.g. "typescript", "python") — only if the user explicitly mentions or strongly implies one
                - "directory": folder name (e.g. "services", "utils", "tests") — only if the user explicitly references a layer or directory

                Only include a filter field if you are confident. Omit uncertain filters entirely.`,
            },
            {
                role: 'user',
                content: question,
            },
        ],
    });

    const raw = response.choices[0]?.message.content ?? '{}';

    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new AppError(`Query interpreter returned invalid JSON: ${raw}`);
    }

    return {
        hypotheticalChunk:
            typeof parsed.hypothetical_chunk === 'string' ? parsed.hypothetical_chunk : question, // fallback: embed the raw question
        filters: {
            language:
                typeof parsed.filters === 'object' &&
                parsed.filters !== null &&
                typeof (parsed.filters as Record<string, unknown>).language === 'string'
                    ? ((parsed.filters as Record<string, unknown>).language as string)
                    : undefined,
            directory:
                typeof parsed.filters === 'object' &&
                parsed.filters !== null &&
                typeof (parsed.filters as Record<string, unknown>).directory === 'string'
                    ? ((parsed.filters as Record<string, unknown>).directory as string)
                    : undefined,
        },
    };
}

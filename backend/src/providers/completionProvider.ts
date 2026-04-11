import { openAIConfig } from '../config/config.js';
import OpenAI from 'openai';
import { AppError } from '../error/appError.js';
import type { ScoredChunk } from '../repositories/chunkRepository.js';
import type { RankedChunkType } from '../services/reranker.js';

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
        max_completion_tokens: 450,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You analyze questions about a JavaScript/Node.js repository using MongoDB, Express, and Socket.IO. Return ONLY valid JSON with exactly two fields:

"hypothetical_chunk": A 3-5 sentence description of the exact code that would answer this question. Write it as if describing real source code — use technical vocabulary, mention likely function names, variable names, patterns, or structures. This will be embedded for semantic search, so match the vocabulary the code would use.

Use these vocabulary hints based on question type:
- Schema/model questions: use Mongoose patterns — mongoose.Schema, required, default, timestamps, ObjectId, ref, type declarations
- Middleware questions: use Socket.IO patterns — socket, next, handshake, emit, EVENTS, io.use()
- Service questions: use Node.js patterns — async/await, try/catch, exported functions, repository calls
- Auth questions: use JWT patterns — jwt.verify, jwt.sign, ACCESS_TOKEN_SECRET, decoded, token, Bearer

"filters": An object with optional fields:
- "language": programming language (e.g. "typescript", "python") — only if the user explicitly mentions a language by name.
- "directory": folder name (e.g. "services", "utils", "middleware") — only if the user explicitly names a folder, layer, or architectural component. Never infer a directory from technical concepts.

Examples of when NOT to extract filters:
- "How is JWT validated on socket connections?" → no filters (neither a language nor a folder was named)
- "How does authentication work?" → no filters
- "What does the Python service do?" → language: "python", no directory filter

Examples of when to extract filters:
- "What's in the middleware folder?" → directory: "middleware"
- "How do the TypeScript services handle errors?" → language: "typescript", directory: "services"

When in doubt, omit the filter entirely. A missing filter is always safer than a wrong one.`,
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

// Scores chunks for relavence using a criteria and a llm call
export async function scoreChunks(question: string, chunks: ScoredChunk[]): Promise<number[]> {
    const chunkList = chunks
        .map(
            (c, i) =>
                `[${i}] ${c.metadata.relativePath} lines ${c.metadata.startLine}–${c.metadata.endLine}\n${c.content.trim()}`
        )
        .join('\n\n---\n\n');

    const response = await openai.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        max_completion_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You are a relevance judge for a code search engine. You will be given a question and a list of code chunks. Score each chunk from 0.0 to 1.0 based on how directly it answers the question.

Scoring guide:
1.0 — contains the direct implementation or exact answer
0.7–0.9 — highly relevant, closely related code
0.4–0.6 — partially relevant, related but not the answer
0.0–0.3 — tangentially related or irrelevant

Return ONLY valid JSON in this exact shape: { "scores": [0.9, 0.4, 0.1, ...] }
The array must have exactly ${chunks.length} numbers, one per chunk in order.`,
            },
            {
                role: 'user',
                content: `Question: ${question}\n\n${chunkList}`,
            },
        ],
    });

    const raw = response.choices[0]?.message.content ?? '{}';

    try {
        const parsed = JSON.parse(raw) as { scores?: unknown };

        if (!Array.isArray(parsed.scores) || parsed.scores.length !== chunks.length) {
            console.warn('Reranker returned unexpected shape, falling back to vector scores');
            return chunks.map(c => c.score);
        }

        return (parsed.scores as unknown[]).map(s =>
            typeof s === 'number' ? Math.min(1, Math.max(0, s)) : 0
        );
    } catch {
        console.warn('Reranker JSON parse failed, falling back to vector scores');
        return chunks.map(c => c.score);
    }
}

export interface CompressedChunkType extends RankedChunkType {
    originalContent: string;
    compressed: boolean;
}

export async function compressChunk(
    question: string,
    chunk: RankedChunkType
): Promise<CompressedChunkType> {
    // Don't bother compressing small chunks — the LLM call costs more than it saves
    if (chunk.content.length < 800) {
        return {
            ...chunk,
            originalContent: chunk.content,
            compressed: false,
        };
    }

    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,
            max_completion_tokens: 500,
            messages: [
                {
                    role: 'system',
                    content: `You are a code context extractor. Given a question and a code chunk, return ONLY the lines from the chunk that are directly relevant to answering the question.

Rules:
- Preserve exact code — do not paraphrase or rewrite
- Include enough surrounding context for the lines to be readable (function signatures, closing braces)
- If the entire chunk is relevant, return it unchanged
- If nothing is relevant, return the string "IRRELEVANT"
- Return only the code, no explanation`,
                },
                {
                    role: 'user',
                    content: `Question: ${question}\n\nCode chunk from ${chunk.metadata.relativePath}:\n\n${chunk.content}`,
                },
            ],
        });

        const result = response.choices[0]?.message.content?.trim() ?? '';

        if (result === 'IRRELEVANT' || result.length === 0) {
            return {
                ...chunk,
                originalContent: chunk.content,
                compressed: false,
            };
        }

        return {
            ...chunk,
            content: result,
            originalContent: chunk.content,
            compressed: true,
        };
    } catch {
        // On any failure, pass the original chunk through unchanged
        return {
            ...chunk,
            originalContent: chunk.content,
            compressed: false,
        };
    }
}

import { openAIConfig } from '../config/config.js';
import OpenAI from 'openai';
import { AppError, OpenAIError } from '../error/appError.js';
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
    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,
            messages: [{ role: 'user', content: message }],
            n: 1,
        });

        if (response.choices[0]?.message) {
            return response.choices[0].message;
        }

        return undefined;
    } catch (err) {
        throw new OpenAIError('OpenAI API error in getOpenAIResponse: ' + err);
    }
}

export async function getOpenAIResponseWithChatHistory(
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | undefined> {
    try {
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
    } catch (err) {
        throw new OpenAIError('OpenAI API error in getOpenAIResponseWithChatHistory: ' + err);
    }
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
    try {
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
- "directory": folder name (e.g. "services", "utils", "middleware") — only if the user explicitly names a folder or directory location. Never infer a directory from technical concepts or component names.

The key test for directory filters: does answering the question require ONLY files in that directory, or might the answer span multiple directories? If it might span directories, omit the filter.

Examples of when NOT to extract filters:
- "How is JWT validated on socket connections?" → no filters (neither a language nor a folder was named)
- "How does authentication work?" → no filters
- "What does the Python service do?" → language: "python", no directory filter (answer may span multiple directories)
- "What services does the messaging controller call?" → no directory filter (needs controllers/ AND services/ to answer — filtering to services/ alone loses the controller file which is the starting point)
- "How does the user service work?" → no directory filter (controllers that call it may also be needed)
- "How does the socket middleware handle authentication?" → no directory filter (answer spans middleware/ and services/)

Examples of when to extract filters:
- "What's in the middleware folder?" → directory: "middleware" (explicit location, only needs middleware/)
- "Walk me through the services directory" → directory: "services" (explicit location)
- "How do the TypeScript services handle errors?" → language: "typescript", directory: "services" (explicit language + collective layer reference with location intent)

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
                typeof parsed.hypothetical_chunk === 'string'
                    ? parsed.hypothetical_chunk
                    : question, // fallback: embed the raw question
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
    } catch (err) {
        throw new OpenAIError('OpenAI API error in interpretQuery:' + err);
    }
}

// Scores chunks for relavence using a criteria and a llm call
export async function scoreChunks(question: string, chunks: ScoredChunk[]): Promise<number[]> {
    try {
        const chunkList = chunks
            .map(
                (c, i) =>
                    `[${i}] ${c.metadata.relativePath} lines ${c.metadata.startLine}–${c.metadata.endLine}\n${c.content.trim()}`
            )
            .join('\n\n---\n\n');

        const response = await openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,
            max_completion_tokens: 400,
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

For questions about data flow, end-to-end processes, or how something travels through the system:
- Prefer chunks that represent different architectural layers (frontend, handler, controller, service, database model)
- Penalize multiple chunks from the same file or layer when a chunk from a different layer is available
- Entry point files (index.js, server.js, app.js) are almost never the answer to a feature flow question — score them 0.0–0.2 unless the question is explicitly about server setup or startup
- Documentation files (README.md, *.md) should score 0.0–0.1 for implementation questions. Only keep them if the question explicitly asks about documentation or architecture overview.

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
    } catch (err) {
        throw new OpenAIError('OpenAI API error in scoreChunks: ' + err);
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

import type { ScoredChunk } from '../repositories/chunkRepository.js';

export type BuiltQueryType = {
    systemPrompt: string;
    userMessage: string;
    contextStats: {
        chunkCount: number;
        totalChars: number;
        filesReferenced: {
            fileName?: string;
            relativePath?: string;
            startLine?: number;
            endLine?: number;
            name?: string;
        }[];
    };
};

// MAIN EXPORT

export function buildQuery(
    question: string,
    chunks: ScoredChunk[],
    repoURL: string
): BuiltQueryType {
    const contextStats = computeContextStats(chunks);

    const systemPrompt = buildSystemPrompt(repoURL, chunks.length === 0);
    const userMessage = buildUserMessage(question, chunks);

    return { systemPrompt, userMessage, contextStats };
}

// SYSTEM PROMPT

function buildSystemPrompt(repoURL: string, emptyContext: boolean): string {
    const base = `You are an expert code assistant analyzing the GitHub repository: ${repoURL}

You will be given relevant code chunks retrieved from the repository, each labeled with their file path and line numbers. Use them to answer the user's question accurately.

Guidelines:
- Reference specific file paths and line numbers when they add clarity (e.g. "in \`src/services/authService.ts\` lines 42–67")
- If the answer spans multiple files, address each one
- If the chunks show partial code, reason about what the surrounding code likely does based on context
- Be concise — developers want direct answers, not essays
- Use markdown code blocks with the correct language tag when quoting code
- Do not invent function names, variable names, or behavior that isn't visible in the chunks`;

    if (emptyContext) {
        return `${base}

IMPORTANT: No relevant code chunks were found for this question. Tell the user clearly that the relevant code could not be located in the indexed repository. Do not guess or fabricate an answer. Suggest they try rephrasing the question or checking if the relevant file was excluded during ingestion.`;
    }

    return base;
}

// USER MESSAGE

function buildUserMessage(question: string, chunks: ScoredChunk[]): string {
    if (chunks.length === 0) {
        return question;
    }

    const formattedChunks = chunks
        .map((chunk, index) => formatChunk(chunk, index + 1))
        .join('\n\n');

    return `Here are the relevant code chunks retrieved from the repository:

${formattedChunks}

---

Question: ${question}`;
}

// CHUNK FORMATTING

function formatChunk(chunk: ScoredChunk, index: number): string {
    const { metadata, content, score } = chunk;

    // Header line: gives the LLM clear source attribution per chunk
    const header = [
        `[Chunk ${index}]`,
        `File: ${metadata.relativePath}`,
        `Lines: ${metadata.startLine}–${metadata.endLine}`,
        metadata.language ? `Language: ${metadata.language}` : null,
        metadata.type ? `Type: ${metadata.type}` : null,
        `Relevance: ${(score * 100).toFixed(0)}%`,
    ]
        .filter(Boolean)
        .join(' | ');

    // Code block with language tag for syntax-aware rendering
    const lang = normalizeLanguageTag(metadata.language);
    const codeBlock = `\`\`\`${lang}\n${content.trim()}\n\`\`\``;

    return `${header}\n${codeBlock}`;
}

// Map your internal language strings to markdown code fence tags
function normalizeLanguageTag(language?: string): string {
    if (!language) return '';

    const map: Record<string, string> = {
        typescript: 'typescript',
        javascript: 'javascript',
        python: 'python',
        java: 'java',
        go: 'go',
        ruby: 'ruby',
        cpp: 'cpp',
        'c++': 'cpp',
        csharp: 'csharp',
        'c#': 'csharp',
        html: 'html',
        css: 'css',
    };

    return map[language.toLowerCase()] ?? language.toLowerCase();
}

// CONTEXT STATS (useful for logging and triggering context compression)

function computeContextStats(chunks: ScoredChunk[]) {
    const totalChars = chunks.reduce((sum, c) => sum + c.content.length, 0);

    const filesReferenced = [
        ...new Set(
            chunks.map(c => {
                const obj: { [key: string]: any } = {};
                if (c.metadata.fileName !== undefined) obj.fileName = c.metadata.fileName;
                if (c.metadata.relativePath !== undefined)
                    obj.relativePath = c.metadata.relativePath;
                if (c.metadata.startLine !== undefined) obj.startLine = c.metadata.startLine;
                if (c.metadata.endLine !== undefined) obj.endLine = c.metadata.endLine;
                if (c.metadata.name !== undefined) obj.name = c.metadata.name;
                return obj;
            })
        ),
    ];

    return {
        chunkCount: chunks.length,
        totalChars,
        filesReferenced,
    };
}

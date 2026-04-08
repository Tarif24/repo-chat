import { getAllRepos, updateRepoLastAccessed, getRepoByURL } from '../services/repoProcessing.js';
import { interpretAndEmbedQuery } from '../services/queryInterpreter.js';
import { applyPostRetrievalFilters } from '../services/postRetrievalFilter.js';
import { searchChunks } from '../services/chunkProcessing.js';
import { buildQuery } from '../services/queryBuilder.js';
import { processUserQuery } from '../services/queryProcessor.js';
import logger from '../lib/logger.js';

export async function userQuery(
    query: string,
    repoURL: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
) {
    // Update the last accessed time for the repository in the database
    await updateRepoLastAccessed(repoURL);

    // Interpret and get the filters for the query, and also get the embedding for the hypothetical chunk
    const { embedding, filters, hypotheticalChunk } = await interpretAndEmbedQuery(query);

    // Temporary logging for debugging and analysis
    logger.info(
        `REPO: ${repoURL} - User query: "${query}" - Interpreted filters: ${JSON.stringify(filters)} - Hypothetical chunk: ${hypotheticalChunk}`
    );

    if (!embedding) {
        logger.warn(`REPO: ${repoURL} - Failed to create embedding for query: "${query}"`);
        return `Sorry, I couldn't understand your query. Please try rephrasing it.`;
    }

    // Search for relevant chunks in the database using the embedding and filters
    const rawChunks = await searchChunks({
        embedding,
        repoURL,
        filters,
        limit: 20,
        numCandidates: 150,
    });

    // Apply post-retrieval filters to the raw search results to improve relevance and reduce noise in the context window
    const chunks = applyPostRetrievalFilters(rawChunks, {
        scoreThreshold: 0.75,
        maxPerFile: 3,
        directory: filters.directory ? filters.directory : '', // fuzzy fallback
        fileSkipScoreThreshold: 0.75,
    });

    // Build the system prompt and user message for the LLM
    const { systemPrompt, userMessage, contextStats } = buildQuery(query, chunks, repoURL);

    // Temporary logging for debugging and analysis
    logger.info(
        `REPO: ${repoURL} - Built query for user question: "${query}" - Context stats: ${JSON.stringify(
            contextStats
        )}`
    );

    // Process the user query with the built system prompt and user message, and also pass the chat history
    const response = await processUserQuery(systemPrompt, userMessage, chatHistory);

    return { response, contextStats };
}

export async function getAllRepositories() {
    const repos = await getAllRepos();

    const repoNames = repos.map(repo => repo.repoURL);

    return repoNames;
}

export async function getRepositoryByURL(repoUrl: string) {
    const repo = await getRepoByURL(repoUrl);
    if (!repo) {
        return `Repository with URL ${repoUrl} not found.`;
    }
    return repo;
}

import { getAllRepos, updateRepoLastAccessed, getRepoByURL } from '../services/repoProcessing.js';
import { interpretAndEmbedQuery } from '../services/queryInterpreter.js';
import { applyPostRetrievalFilters } from '../services/postRetrievalFilter.js';
import { searchChunks } from '../services/chunkProcessing.js';
import { buildQuery } from '../services/queryBuilder.js';
import { processUserQuery } from '../services/queryProcessor.js';
import { rerankChunks } from '../services/reranker.js';
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

    logger.info(
        `REPO: ${repoURL} - Retrieved ${rawChunks.length} raw chunks for query: "${query}" before post-retrieval filtering`
    );
    logger.info(
        `REPO: ${repoURL} - Raw chunks metadata and scores: ${rawChunks
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})`)
            .join(', ')}`
    );

    // Apply post-retrieval filters to the raw search results to improve relevance and reduce noise in the context window
    const filteredChunks = applyPostRetrievalFilters(rawChunks, {
        scoreThreshold: 0.75,
        maxPerFile: 3,
        directory: filters.directory ? filters.directory : '', // fuzzy fallback
        fileSkipScoreThreshold: 0.75,
    });

    logger.info(
        `REPO: ${repoURL} - Retrieved ${filteredChunks.length} filtered chunks for query: "${query}" after post-retrieval filtering`
    );
    logger.info(
        `REPO: ${repoURL} - Filtered chunks metadata and scores: ${filteredChunks
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})`)
            .join(', ')}`
    );

    // Rerank — cuts from ~15 filtered chunks down to top 8
    const reranked = await rerankChunks(query, filteredChunks, 8);

    logger.info(
        `REPO: ${repoURL} - Retrieved ${reranked.length} Reranked for query: "${query}" after reranking`
    );
    logger.info(
        `REPO: ${repoURL} - Reranked metadata and scores: ${reranked
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})`)
            .join(', ')}`
    );

    // Build the system prompt and user message for the LLM
    const { systemPrompt, userMessage, contextStats } = buildQuery(query, reranked, repoURL);

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

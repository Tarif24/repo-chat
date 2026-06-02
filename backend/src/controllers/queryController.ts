import { createEmbedding } from '../providers/embeddingProvider.js';
import { cacheCheck, cacheSave } from '../services/semanticCache.js';
import { getAllRepos, updateRepoLastAccessed, getRepoByURL } from '../services/repoProcessing.js';
import { interpretAndEmbedQuery } from '../services/queryInterpreter.js';
import { applyPostRetrievalFilters } from '../services/postRetrievalFilter.js';
import { searchChunks } from '../services/chunkProcessing.js';
import { buildQuery } from '../services/queryBuilder.js';
import { processUserQuery } from '../services/queryProcessor.js';
import { rerankChunks } from '../services/reranker.js';
import { compressContext } from '../services/contextCompression.js';
import { isRelevant } from '../services/guards.js';
import logger from '../lib/logger.js';

export async function userQuery(
    rawQuery: string,
    repoURL: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
) {
    // Check if the query is relevant to the code repository Q&A context to prevent abuse of the system for general questions
    const relevanceResult = await isRelevant(rawQuery);

    if (!relevanceResult.relevant) {
        logger.warn(`REPO: ${repoURL} - Irrelevant query blocked: "${rawQuery}"`);
        return {
            message: `Sorry, your query doesn't seem to be related to the code repository. Please ask questions that are specific to the codebase or its features.`,
            contextStats: null,
        };
    }

    const query = relevanceResult.sanitizedQuery; // Use the sanitized query for further processing

    // Update the last accessed time for the repository in the database
    await updateRepoLastAccessed(repoURL);

    // Cache check
    const queryEmbedding = await createEmbedding(query);
    if (queryEmbedding) {
        // Check the semantic cache for a relevant cached response before proceeding with the full query processing pipeline
        const cachedResponse = await cacheCheck(repoURL, queryEmbedding);
        if (cachedResponse && cachedResponse.length > 0) {
            logger.info(`REPO: ${repoURL} - Cache hit for query: "${query}"`);
            return { message: cachedResponse, contextStats: null };
        }
    }

    // Interpret and get the filters for the query, and also get the embedding for the hypothetical chunk
    const { embedding, filters, hypotheticalChunk } = await interpretAndEmbedQuery(query);

    // Temporary logging for debugging and analysis
    logger.info(
        `REPO: ${repoURL} - User query: "${query}" - Interpreted filters: ${JSON.stringify(filters)} - Hypothetical chunk: ${hypotheticalChunk}`
    );

    if (!embedding) {
        logger.warn(`REPO: ${repoURL} - Failed to create embedding for query: "${query}"`);
        return {
            message: `Sorry, I couldn't understand your query. Please try rephrasing it.`,
            contextStats: null,
        };
    }

    // Search for relevant chunks in the database using the embedding and filters
    const rawChunks = await searchChunks({
        embedding,
        repoURL,
        filters,
        limit: 20,
        numCandidates: 200,
    });

    logger.info(
        `REPO: ${repoURL} - Retrieved ${rawChunks.length} raw chunks for query: "${query}" before post-retrieval filtering`
    );
    logger.info(
        `REPO: ${repoURL} - Raw chunks metadata and scores: ${rawChunks
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})` + '\n')
            .join(', ')}`
    );

    // Apply post-retrieval filters to the raw search results to improve relevance and reduce noise in the context window
    let filteredChunks = applyPostRetrievalFilters(rawChunks, query, {
        scoreThreshold: 0.72,
        maxPerFile: 3,
        maxPerFileDiverse: 2,
        directory: filters.directory ? filters.directory : '', // fuzzy fallback
        fileSkipScoreThreshold: 0.75,
        dominantFilePctThreshold: 80,
        dominantDiversityFilePctThreshold: 40,
    });

    if (filteredChunks.length === 1) {
        filteredChunks = applyPostRetrievalFilters(rawChunks, query, {
            scoreThreshold: 0.68,
            maxPerFile: 3,
            maxPerFileDiverse: 2,
            directory: filters.directory ? filters.directory : '', // fuzzy fallback
            fileSkipScoreThreshold: 0.7,
            dominantFilePctThreshold: 80,
            dominantDiversityFilePctThreshold: 40,
        });
    }

    logger.info(
        `REPO: ${repoURL} - Retrieved ${filteredChunks.length} filtered chunks for query: "${query}" after post-retrieval filtering`
    );
    logger.info(
        `REPO: ${repoURL} - Filtered chunks metadata and scores: ${filteredChunks
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})` + '\n')
            .join(', ')}`
    );

    // Rerank — cuts from ~15 filtered chunks down to top n
    const reranked = await rerankChunks(query, filteredChunks, 7);

    logger.info(
        `REPO: ${repoURL} - Retrieved ${reranked.length} Reranked for query: "${query}" after reranking`
    );
    logger.info(
        `REPO: ${repoURL} - Reranked metadata and scores: ${reranked
            .map(c => `${c.metadata.relativePath} (score: ${c.score.toFixed(3)})` + '\n')
            .join(', ')}`
    );

    // Compress the context if it's too large to fit in the LLM context window, while trying to preserve relevance and important details
    const compressed = await compressContext(query, reranked, 8_000);

    // Build the system prompt and user message for the LLM
    const { systemPrompt, userMessage, contextStats } = buildQuery(query, compressed, repoURL);

    logger.info(
        `REPO: ${repoURL} - PIPELINE STATS - ${JSON.stringify({
            rawQuery: rawQuery,
            query: query,
            raw: rawChunks.length,
            filtered: filteredChunks.length,
            reranked: reranked.length,
            compressed: compressed.filter(c => c.compressed).length,
            totalChars: contextStats.totalChars,
            files: contextStats.filesReferenced,
        })}
        )}`
    );

    // Process the user query with the built system prompt and user message, and also pass the chat history
    const response = await processUserQuery(systemPrompt, userMessage, chatHistory);

    // Save the response to the semantic cache along with the query and its embedding for future cache hits
    if (queryEmbedding) {
        await cacheSave(repoURL, query, queryEmbedding, response?.content || '');
    }

    return { message: response?.content, contextStats };
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

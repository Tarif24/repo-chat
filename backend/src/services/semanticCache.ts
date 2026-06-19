import {
    searchSemanticCache,
    saveSemanticCache,
    invalidateSemanticCache,
} from '../repositories/semanticCacheRepository.js';

export async function cacheCheck(
    repoURL: string,
    queryEmbedding: number[],
    similarityThreshold: number = 0.95
): Promise<{ response: string; contextStats: any } | null> {
    const cacheCheckResult = await searchSemanticCache(repoURL, queryEmbedding);

    if (!cacheCheckResult || cacheCheckResult.score < similarityThreshold) {
        return null;
    }

    return { response: cacheCheckResult.response, contextStats: cacheCheckResult.contextStats };
}

export async function cacheSave(
    repoURL: string,
    query: string,
    queryEmbedding: number[],
    response: string,
    contextStats: any
): Promise<void> {
    return await saveSemanticCache(repoURL, query, queryEmbedding, response, contextStats);
}

export async function cacheInvalidate(repoURL: string): Promise<void> {
    return await invalidateSemanticCache(repoURL);
}

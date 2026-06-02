// repositories/cacheRepository.ts
import { SemanticCache } from '../database/models/index.js';

export async function searchSemanticCache(
    repoURL: string,
    embedding: number[]
): Promise<{ response: string; score: number } | null> {
    const results = (await SemanticCache.collection
        .aggregate([
            {
                $vectorSearch: {
                    index: 'semantic_cache_vector_index',
                    path: 'queryEmbedding',
                    queryVector: embedding,
                    numCandidates: 20,
                    limit: 1,
                    filter: { repoURL },
                },
            },
            { $addFields: { score: { $meta: 'vectorSearchScore' } } },
            { $project: { response: 1, score: 1, _id: 0 } },
        ])
        .toArray()) as { response: string; score: number }[];

    if (!results[0]) return null;

    return results[0];
}

export async function saveSemanticCache(
    repoURL: string,
    query: string,
    queryEmbedding: number[],
    response: string
): Promise<void> {
    await SemanticCache.create({ repoURL, query, queryEmbedding, response });
}

export async function invalidateSemanticCache(repoURL: string): Promise<void> {
    await SemanticCache.deleteMany({ repoURL });
}

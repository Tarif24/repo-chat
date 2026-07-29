import { SemanticCache } from '../database/models/index.js';

export async function searchSemanticCache(
    repoURL: string,
    embedding: number[]
): Promise<{ response: string; score: number; contextStats: any } | null> {
    try {
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
                { $project: { response: 1, score: 1, _id: 0, contextStats: 1 } },
            ])
            .toArray()) as { response: string; score: number; contextStats: any }[];

        if (!results[0]) {
            return null;
        }

        return results[0];
    } catch {
        const fallbackDoc = await SemanticCache.findOne({ repoURL }).sort({ createdAt: -1 }).lean();

        if (!fallbackDoc) {
            return null;
        }

        return {
            response: fallbackDoc.response,
            score: 1,
            contextStats: fallbackDoc.contextStats,
        };
    }
}

export async function saveSemanticCache(
    repoURL: string,
    query: string,
    queryEmbedding: number[],
    response: string,
    contextStats: any
): Promise<void> {
    await SemanticCache.create({ repoURL, query, queryEmbedding, response, contextStats });
}

export async function invalidateSemanticCache(repoURL: string): Promise<void> {
    await SemanticCache.deleteMany({ repoURL });
}

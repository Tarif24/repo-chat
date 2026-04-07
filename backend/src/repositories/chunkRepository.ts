import { Chunk } from '../database/models/index.js';
import type { ChunkMetadata, ChunkDoc } from '../database/models/index.js';

export async function createChunk(data: {
    content: string;
    embedding: number[];
    metadata: ChunkMetadata;
}) {
    return await Chunk.create(data);
}

export async function deleteChunksByRepoURL(repoURL: string) {
    return await Chunk.deleteMany({ 'metadata.repoURL': repoURL });
}

export type VectorSearchParamsType = {
    embedding: number[];
    repoURL: string;
    filters?: {
        language?: string | undefined;
    };
    limit?: number; // how many results to return
    numCandidates?: number; // ANN candidate pool size
};

export interface ScoredChunk extends ChunkDoc {
    score: number;
}

export async function vectorSearch(params: VectorSearchParamsType): Promise<ScoredChunk[]> {
    const { embedding, repoURL, filters = {}, limit = 20, numCandidates = 150 } = params;

    // BUILD PRE-FILTER

    // Build the pre-filter object for $vectorSearch. This filters which documents are considered in the ANN search, based on metadata.
    const preFilter: Record<string, unknown> = {
        'metadata.repoURL': { $eq: repoURL },
    };

    if (filters.language) {
        preFilter['metadata.language'] = { $eq: filters.language };
    }

    //PIPELINE

    const pipeline = [
        {
            $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector: embedding,
                numCandidates,
                limit,
                filter: preFilter,
            },
        },
        {
            // Attach the cosine similarity score to each result document
            $addFields: {
                score: { $meta: 'vectorSearchScore' },
            },
        },
        {
            // Drop the embedding vector — it's large and you don't need it after search.
            $project: {
                embedding: 0,
            },
        },
    ];

    const results = await Chunk.collection.aggregate<ScoredChunk>(pipeline).toArray();

    return results;
}

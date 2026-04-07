import { interpretQuery } from '../providers/completionProvider.js';
import { createEmbedding } from '../providers/embeddingProvider.js';
import { type QueryInterpretationType } from '../providers/completionProvider.js';

export type InterpretedQuery = {
    embedding: number[] | undefined;
    filters: QueryInterpretationType['filters'];
    hypotheticalChunk: string;
};

export async function interpretAndEmbedQuery(question: string): Promise<InterpretedQuery> {
    const interpretation = await interpretQuery(question);

    // Embedded the hypothetical chunk, not the raw question
    const embedding = await createEmbedding(interpretation.hypotheticalChunk);

    return {
        embedding,
        filters: interpretation.filters,
        hypotheticalChunk: interpretation.hypotheticalChunk,
    };
}

import { Chunk } from '../database/models/index.js';

export async function createChunk(data: {
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
}) {
    return await Chunk.create(data);
}

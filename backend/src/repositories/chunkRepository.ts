import { Chunk } from '../database/models/index.js';
import type { ChunkMetadata } from '../database/models/index.js';

export async function createChunk(data: {
    content: string;
    embedding: number[];
    metadata: ChunkMetadata;
}) {
    return await Chunk.create(data);
}

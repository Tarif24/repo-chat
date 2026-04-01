import { createChunk } from '../repositories/chunkRepository.js';
import { createEmbedding } from '../providers/embeddingProvider.js';
import type { CodeChunkType } from './treeSitter.js';
import logger from '../lib/logger.js';
import { CreationError, AppError } from '../error/appError.js';

export async function processAndStoreChunk(chunk: CodeChunkType, repoURL: string) {
    const embedding = await createEmbedding(chunk.embeddingText);

    if (!embedding) {
        throw new CreationError('Failed to create embedding for chunk:' + chunk);
    }

    const newChunkData = {
        content: chunk.chunk,
        embedding,
        metadata: {
            repoURL: repoURL,
            relativePath: chunk.relativePath,
            name: chunk.name,
            type: chunk.type,
            language: chunk.language,
            parentDir: chunk.parentDir,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
        },
    };

    const newChunk = await createChunk(newChunkData);

    if (!newChunk) {
        throw new CreationError('Failed to create chunk in database:' + chunk);
    }
}

export async function processAndStoreChunks(chunks: CodeChunkType[], repoURL: string) {
    logger.info(`REPO: ${repoURL} - Processing and storing ${chunks.length} chunks...`);

    for (const chunk of chunks) {
        try {
            await processAndStoreChunk(chunk, repoURL);
        } catch (error) {
            logger.error('Error processing chunk:', error);
            throw new AppError('Error processing chunk');
        }
    }

    logger.info(`REPO: ${repoURL} - Finished processing and storing chunks.`);
}

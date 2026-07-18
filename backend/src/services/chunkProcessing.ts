import { createChunk, vectorSearch } from '../repositories/chunkRepository.js';
import type { VectorSearchParamsType } from '../repositories/chunkRepository.js';
import { createEmbedding } from '../providers/embeddingProvider.js';
import type { CodeChunkType } from './treeSitter.js';
import logger from '../lib/logger.js';
import { CreationError, AppError, OpenAIError } from '../error/appError.js';

export async function processAndStoreChunk(chunk: CodeChunkType, repoURL: string) {
    const embedding = await createEmbedding(chunk.embeddingText);

    if (!embedding) {
        throw new CreationError('Failed to create embedding for chunk:' + chunk);
    }

    if (
        !chunk.chunk ||
        !embedding ||
        !repoURL ||
        !chunk.relativePath ||
        !chunk.fileName ||
        !chunk.name ||
        !chunk.type ||
        !chunk.language ||
        !chunk.parentDir ||
        !chunk.startLine ||
        !chunk.endLine
    ) {
        logger.info(
            `REPO: ${repoURL} - Processing chunk: ${chunk.name} (${chunk.relativePath}:${chunk.startLine}-${chunk.endLine})`
        );
    }

    const newChunkData = {
        content: chunk.chunk,
        embedding,
        metadata: {
            repoURL: repoURL,
            relativePath: chunk.relativePath,
            fileName: chunk.fileName,
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

export async function processAndStoreChunks(
    chunks: CodeChunkType[],
    repoURL: string,
    emit: (event: string, data: object) => void
) {
    let totalProcessedChunks = 0;
    logger.info(`REPO: ${repoURL} - Processing and storing ${chunks.length} chunks...`);

    for (const chunk of chunks) {
        try {
            await processAndStoreChunk(chunk, repoURL);
            totalProcessedChunks++;
            emit('embeddingAndProcessing', {
                message: 'Processing and storing chunks...',
                current: totalProcessedChunks,
                totalChunks: chunks.length,
            });
        } catch (error) {
            logger.error('Error processing chunk:', error);

            if (error instanceof OpenAIError) {
                emit('error', { message: error.message || 'Chunk processing failed' });
                throw error;
            } else {
                emit('error', { message: error || 'Chunk processing failed' });
                throw new AppError(
                    'Error processing chunk: ' +
                        (error instanceof Error ? error.message : String(error))
                );
            }
        }
    }

    logger.info(`REPO: ${repoURL} - Finished processing and storing chunks.`);
}

export async function searchChunks(params: VectorSearchParamsType) {
    try {
        const results = await vectorSearch(params);
        return results;
    } catch (error) {
        logger.error('Error searching chunks:', error);
        throw new AppError('Error searching chunks');
    }
}

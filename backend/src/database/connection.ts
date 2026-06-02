import mongoose from 'mongoose';
import logger from '../lib/logger.js';
import { dbConfig } from '../config/config.js';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createSearchIndexes = async (retries = 10, delayMs = 5000): Promise<void> => {
    for (let i = 0; i < retries; i++) {
        try {
            const db = mongoose.connection.db;
            if (!db) return;

            const chunksCollection = db.collection('chunks');
            const chunksExisting = await chunksCollection.listSearchIndexes().toArray();
            const chunksExists = chunksExisting.some(
                (idx: any) => idx.name === 'chunk_vector_index'
            );

            if (!chunksExists) {
                await chunksCollection.createSearchIndex({
                    name: 'chunk_vector_index',
                    type: 'vectorSearch',
                    definition: {
                        fields: [
                            {
                                type: 'vector',
                                path: 'embedding',
                                numDimensions: 1536,
                                similarity: 'cosine',
                            },
                            { type: 'filter', path: 'metadata.repoURL' },
                            { type: 'filter', path: 'metadata.language' },
                            { type: 'filter', path: 'metadata.directory' },
                        ],
                    },
                });
                logger.info('Chunk vector search index created');
            } else {
                logger.info('Chunk vector search index already exists');
            }

            const semanticCacheCollection = db.collection('semantic-caches');
            const semanticCacheExisting = await semanticCacheCollection
                .listSearchIndexes()
                .toArray();
            const semanticCacheExists = semanticCacheExisting.some(
                (idx: any) => idx.name === 'semantic_cache_vector_index'
            );

            if (!semanticCacheExists) {
                await semanticCacheCollection.createSearchIndex({
                    name: 'semantic_cache_vector_index',
                    type: 'vectorSearch',
                    definition: {
                        fields: [
                            {
                                type: 'vector',
                                path: 'queryEmbedding',
                                numDimensions: 1536,
                                similarity: 'cosine',
                            },
                            { type: 'filter', path: 'repoURL' },
                        ],
                    },
                });

                logger.info('Semantic cache vector search index created');
            } else {
                logger.info('Semantic cache vector search index already exists');
            }

            return;
        } catch (err) {
            logger.warn(
                `Attempt ${i + 1}/${retries} - Search index service not ready yet, retrying in ${delayMs / 1000}s...`
            );
            await wait(delayMs);
        }
    }
    logger.warn(
        'Could not create vector search index - mongot service unavailable. Server will continue without it.'
    );
};

const connectToDatabase = async () => {
    try {
        const options: Parameters<typeof mongoose.connect>[1] = {
            //directConnection: true,
            serverSelectionTimeoutMS: 10000,
        };

        await mongoose.connect(dbConfig.mongoUrl, options);

        logger.info('Connected to MongoDB');
        await mongoose.syncIndexes();
        logger.info('Indexes synchronized');

        //await createSearchIndexes();
        // Run in background — does not block server startup
        createSearchIndexes().catch(err => logger.warn('Search index creation failed:', err));

        return mongoose.connection.db;
    } catch (error) {
        logger.error('Database connection error:', error);
        process.exit(1);
    }
};

export default connectToDatabase;

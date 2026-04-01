import mongoose from 'mongoose';
import { dbConfig } from '../config/config.js';
import logger from '../lib/logger.js';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createSearchIndexes = async (retries = 10, delayMs = 5000): Promise<void> => {
    for (let i = 0; i < retries; i++) {
        try {
            const db = mongoose.connection.db;
            if (!db) return;

            const collection = db.collection('chunks');
            const existing = await collection.listSearchIndexes().toArray();
            const exists = existing.some((idx: any) => idx.name === 'vector_index');

            if (!exists) {
                await collection.createSearchIndex({
                    name: 'vector_index',
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
                logger.info('Vector search index created');
            } else {
                logger.info('Vector search index already exists');
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
            directConnection: true,
            serverSelectionTimeoutMS: 10000,
        };

        await mongoose.connect(dbConfig.mongoUrl, options);

        logger.info('Connected to MongoDB');
        await mongoose.syncIndexes();
        logger.info('Indexes synchronized');

        await createSearchIndexes();

        return mongoose.connection.db;
    } catch (error) {
        logger.error('Database connection error:', error);
        process.exit(1);
    }
};

export default connectToDatabase;

import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { dbConfig } from '../config/config.js';
import logger from '../lib/logger.js';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getReplicaSetName = async (retries = 5, delayMs = 3000): Promise<string | null> => {
    for (let i = 0; i < retries; i++) {
        const client = new MongoClient('mongodb://mongo_database:27017', {
            directConnection: true,
            serverSelectionTimeoutMS: 5000,
        });
        try {
            await client.connect();
            const result = await client.db('admin').command({ getCmdLineOpts: 1 });
            const name = result.parsed?.replication?.replSet ?? null;
            logger.info(`Replica set name fetched: ${name}`);
            return name;
        } catch (err) {
            logger.warn(`Attempt ${i + 1}/${retries} - waiting for MongoDB to be ready...`);
            await wait(delayMs);
        } finally {
            await client.close().catch(() => {});
        }
    }
    return null;
};

const waitForPrimary = async (replicaSet: string, retries = 5, delayMs = 3000): Promise<void> => {
    for (let i = 0; i < retries; i++) {
        const client = new MongoClient(
            `mongodb://mongo_database:27017/?replicaSet=${replicaSet}&directConnection=true`,
            {
                serverSelectionTimeoutMS: 5000,
            }
        );
        try {
            await client.connect();
            const status = await client.db('admin').command({ replSetGetStatus: 1 });
            const primary = status.members?.find((m: any) => m.stateStr === 'PRIMARY');
            if (primary) {
                logger.info('Primary is ready');
                return;
            }
            logger.warn(`Attempt ${i + 1}/${retries} - waiting for primary election...`);
        } catch (err) {
            logger.warn(`Attempt ${i + 1}/${retries} - replica set not ready yet...`);
        } finally {
            await client.close().catch(() => {});
        }
        await wait(delayMs);
    }
    throw new Error('Primary never became available');
};

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
                            { type: 'filter', path: 'metadata.repoID' },
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
        const replicaSet = await getReplicaSetName();

        if (replicaSet) {
            await waitForPrimary(replicaSet);
        }

        const options: Parameters<typeof mongoose.connect>[1] = {
            directConnection: true,
            serverSelectionTimeoutMS: 10000,
        };
        if (replicaSet) {
            (options as any).replicaSet = replicaSet;
        }

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

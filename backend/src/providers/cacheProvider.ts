import { Redis } from 'ioredis';
import logger from '../lib/logger.js';

let client: Redis | null = null;

export function getCacheClient(): Redis {
    if (client) return client;

    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

    client = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: 3,
        retryStrategy: times => {
            if (times > 3) return null;
            return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', err => logger.error('Redis error: ' + err.message));
    client.on('close', () => logger.warn('Redis connection closed'));

    return client;
}

export async function connectCache(): Promise<void> {
    const redis = getCacheClient();
    await redis.connect();
}

export async function disconnectCache(): Promise<void> {
    if (client) {
        await client.quit();
        client = null;
    }
}

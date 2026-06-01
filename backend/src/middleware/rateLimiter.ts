import type { RateLimitRequestHandler, Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getCacheClient } from '../providers/cacheProvider.js';

const rateLimitHandler = (_req: Request, res: Response): void => {
    res.standardResponse(
        429,
        {
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: res.getHeader('Retry-After') ?? null,
        },
        'Too many requests'
    );
};

const globalLimiterOptions: Partial<Options> = {
    windowMs: 10 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler,
    store: new RedisStore({
        prefix: 'rl:global:',
        sendCommand: (command: string, ...args: string[]) =>
            getCacheClient().call(command, ...args) as Promise<number>,
    }),
};

const strictLimiterOptions: Partial<Options> = {
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler,
    store: new RedisStore({
        prefix: 'rl:strict:',
        sendCommand: (command: string, ...args: string[]) =>
            getCacheClient().call(command, ...args) as Promise<number>,
    }),
};

export const globalLimiter: RateLimitRequestHandler = rateLimit(globalLimiterOptions);
export const strictLimiter: RateLimitRequestHandler = rateLimit(strictLimiterOptions);

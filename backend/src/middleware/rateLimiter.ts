import type { RateLimitRequestHandler, Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const isLocalOrTest = env.NODE_ENV !== 'production';

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
    // Skip rate limiting for the ingest status route so status checks aren't throttled
    skip: (req: Request) => {
        const path = req.originalUrl.split('?')[0];
        return path === '/api/ingest/status';
    },
    handler: rateLimitHandler,
};

const strictLimiterOptions: Partial<Options> = {
    windowMs: 10 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Also avoid applying global skip logic here; strict limiter is applied explicitly to `/repo` route only
    handler: rateLimitHandler,
};

export const globalLimiter: RateLimitRequestHandler = isLocalOrTest
    ? (((_req, _res, next) => next()) as RateLimitRequestHandler)
    : rateLimit(globalLimiterOptions);

export const strictLimiter: RateLimitRequestHandler = isLocalOrTest
    ? (((_req, _res, next) => next()) as RateLimitRequestHandler)
    : rateLimit(strictLimiterOptions);

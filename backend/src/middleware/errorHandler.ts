// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/appError.js';
import { ZodError } from 'zod';
import logger from '../lib/logger.js';

export default function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    // Zod validation errors
    if (err instanceof ZodError) {
        logger.warn(`Validation failed — ${req.method} ${req.originalUrl}: ${err.message}`);
        return res.status(400).json({
            error: 'Validation error',
            issues: err.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
        });
    }

    // Known, intentional error
    if (err instanceof AppError) {
        logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, err);
        return res.status(err.statusCode).json({
            error: {
                message: err.message,
                code: err.code,
            },
        });
    }

    // Unknown/unexpected error — don't leak details
    logger.error(`${req.method} ${req.originalUrl} — unknown error`, new Error(String(err)));
    return res.status(500).json({
        error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
        },
    });
}

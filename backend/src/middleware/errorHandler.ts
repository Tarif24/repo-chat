// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError, OpenAIError } from '../error/appError.js';
import { ZodError } from 'zod';
import { deleteRepo } from '../services/repoProcessing.js';
import logger from '../lib/logger.js';

export default function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    // Zod validation errors
    if (err instanceof ZodError) {
        logger.warn(`Validation failed — ${req.method} ${req.originalUrl}: ${err.message}`);

        return res.standardResponse(
            400,
            {
                error: 'Validation error',
                issues: err.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
            },
            'Validation error'
        );
    }

    if (req.originalUrl === '/api/ingest/repo') {
        deleteRepo(req.body.repoUrl).catch(deleteErr => {
            logger.error(
                `Failed to delete repo after error during ingestion for ${req.body.repoUrl}: ${deleteErr.message}`,
                deleteErr
            );
        });

        logger.info(
            `REPO: ${req.body.repoUrl} - Deleted repository due to error during ingestion.`
        );
    }

    // Known, intentional error
    if (err instanceof AppError) {
        logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, err);
        if (err instanceof OpenAIError) {
            logger.error(`OpenAIError details: ${err.message}`, err);
            return res.standardResponse(
                err.statusCode,
                {
                    message:
                        'An error occurred while communicating with the OpenAI API, sorry for the inconvenience and please try again later',
                },
                'OpenAI API error occurred'
            );
        }
        return res.standardResponse(
            err.statusCode,
            {
                error: {
                    message: err.message,
                    code: err.code,
                },
            },
            err.message
        );
    }

    // Unknown/unexpected error — don't leak details
    logger.error(`${req.method} ${req.originalUrl} — unknown error`, new Error(String(err)));

    return res.standardResponse(
        500,
        {
            error: {
                message: 'Internal server error',
                code: 'INTERNAL_ERROR',
            },
        },
        'Internal server error'
    );
}

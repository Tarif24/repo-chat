// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/appError.js';

export default function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    // Known, intentional error
    if (err instanceof AppError) {
        console.error(err);
        return res.status(err.statusCode).json({
            error: {
                message: err.message,
                code: err.code,
            },
        });
    }

    // Unknown/unexpected error — don't leak details
    console.error(err);
    return res.status(500).json({
        error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
        },
    });
}

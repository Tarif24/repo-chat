import type { Request, Response, NextFunction } from 'express';

export function responseHandler(_req: Request, res: Response, next: NextFunction): void {
    res.standardResponse = (statusCode: number, data: any, message = 'Success') => {
        return res.status(statusCode).json({
            success: statusCode < 400,
            message,
            data,
            timestamp: new Date().toISOString(),
        });
    };
    next();
}

import type { ZodTypeAny } from 'zod';
import type { Request, Response, NextFunction } from 'express';

type RequestPart = 'body' | 'params' | 'query';

export function validate(schema: ZodTypeAny, part: RequestPart = 'body') {
    return (req: Request, _res: Response, next: NextFunction): void => {
        req[part] = schema.parse(req[part]);
        next();
    };
}

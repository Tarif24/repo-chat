import 'express';

declare module 'express-serve-static-core' {
    interface Response {
        standardResponse: (statusCode: number, data: any, message?: string) => Response;
    }
}

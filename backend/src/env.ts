import { z } from 'zod';
//import logger from './lib/logger.js';

const envSchema = z.object({
    // app
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).default(5000),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug', 'verbose']).default('info'),

    // mongodb
    MONGO_URL: z
        .string()
        .regex(
            /^mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^:/]+(:\d+)?\/[^?]+(\?.*)?$/,
            'MONGO_URL must be a valid MongoDB connection string'
        ),

    // openai
    OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
    OPENAI_CHAT_MODEL: z.string().min(1, 'OPENAI_CHAT_MODEL is required'),
    OPENAI_EMBEDDING_MODEL: z.string().min(1, 'OPENAI_EMBEDDING_MODEL is required'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error('Missing or invalid environment variables:\n');
    //logger.error('Environment validation failed. Exiting.');
    result.error.issues.forEach(issue => {
        console.error(`  ${issue.path.join('.')}: ${issue.message}`);
        //logger.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
}

export const env = result.data;

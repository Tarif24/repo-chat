import { env } from './env.js';

export const appConfig = {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    repoStoragePath: env.REPO_STORAGE_PATH,
};

export const dbConfig = {
    mongoUrl: env.MONGO_URL,
};

export const openAIConfig = {
    apiKey: env.OPENAI_API_KEY,
    chatModel: env.OPENAI_CHAT_MODEL,
    embeddingModel: env.OPENAI_EMBEDDING_MODEL,
};

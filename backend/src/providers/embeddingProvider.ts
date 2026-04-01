import { openAIConfig } from '../config/config.js';
import OpenAI from 'openai';

const OPENAI_API_KEY = openAIConfig.apiKey;
const OPENAI_EMBEDDING_MODEL = openAIConfig.embeddingModel;

// Create an instance of the OpenAI class with the API key
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export async function createEmbedding(input: string): Promise<number[] | undefined> {
    // Create the embedding for the user message
    const embedding = await openai.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: input,
        encoding_format: 'float',
    });

    if (embedding?.data[0]?.embedding) {
        return embedding.data[0].embedding;
    }
    return undefined;
}

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create an instance of the OpenAI class with the API key
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export async function getEmbedding(input: string): Promise<number[] | undefined> {
    // Create the embedding for the user message
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: input,
        encoding_format: 'float',
    });

    if (embedding?.data[0]?.embedding) {
        return embedding.data[0].embedding;
    }
    return undefined;
}

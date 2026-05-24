import { checkQueryRelevance } from '../providers/completionProvider.js';

// This guard is used to check if a incoming query is relevant to the usage of this website and not just exploiting its LLM capabilities for general questions
export async function isRelevant(query: string) {
    const relevance = await checkQueryRelevance(query);
    return relevance;
}

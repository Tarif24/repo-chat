import logger from '../lib/logger.js';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: 'ca-central-1' });

export async function loadSecrets() {
    const names = [
        '/repo-chat/prod/PORT',
        '/repo-chat/prod/REPO_STORAGE_PATH',
        '/repo-chat/prod/MONGO_URL',
        '/repo-chat/prod/LOG_LEVEL',
        '/repo-chat/prod/OPENAI_API_KEY',
        '/repo-chat/prod/OPENAI_CHAT_MODEL',
        '/repo-chat/prod/OPENAI_EMBEDDING_MODEL',
    ];
    for (const name of names) {
        try {
            const result = await ssm.send(
                new GetParameterCommand({ Name: name, WithDecryption: true })
            );
            const key = name.split('/').pop()!;
            process.env[key] = result.Parameter!.Value!;
        } catch {
            logger.warn(`Failed to load SSM parameter ${name}:`);
        }
    }
    logger.info('Secrets loading complete from AWS SSM');
}

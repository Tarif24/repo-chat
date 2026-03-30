import logger from '../lib/logger.js';
import type { ParseableFileType } from './files.js';

async function parseFile(file: ParseableFileType): Promise<void> {
    console.log(`Parsing file: ${file.relativePath} (Language: ${file.language})`);
}

export async function parseFiles(files: ParseableFileType[], repoURL: string): Promise<void> {
    if (files.length === 0) {
        logger.warn(`REPO: ${repoURL} - No parseable files found in the repository.`);
        return;
    }

    // Process files concurrently in batches to avoid overwhelming the parser
    const BATCH_SIZE = 10;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        logger.info(
            `REPO: ${repoURL} - Parsing batch ${i / BATCH_SIZE + 1} with ${batch.length} files.`
        );
        await Promise.all(batch.map(parseFile));
    }
}

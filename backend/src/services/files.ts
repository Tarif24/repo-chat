import { readdir, rm } from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../lib/logger.js';
import { NotFoundError } from '../error/appError.js';
import SUPPORTED_LANGUAGES from '../lib/supportedLanguages.js';
import IGNORED_DIRS from '../lib/ignoredDirs.js';

// Recursively deletes all files and subdirectories in the specified directory
export async function deleteEverythingInDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
        entries.map(async entry => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await deleteEverythingInDir(fullPath);
                await rm(fullPath, { recursive: true, force: true });
            } else {
                await rm(fullPath, { force: true });
            }
        })
    );
}

export type ParseableFile = {
    absolutePath: string;
    relativePath: string;
    language: string;
    extension: string;
};

// Recursively walks through a directory and collects files that match supported languages, while skipping ignored directories
export function collectParseableFiles(
    rootDir: string,
    repoURL: string
): ParseableFile[] | undefined {
    const resolvedRoot = path.resolve(rootDir);

    if (!fs.existsSync(resolvedRoot)) {
        throw new NotFoundError(`Root directory does not exist: ${resolvedRoot}`);
    }

    const files: ParseableFile[] = [];
    let skippedCount = 0;
    let totalScanned = 0;

    // Helper function to recursively walk through directories
    function walk(dir: string): void {
        let entries: fs.Dirent[];

        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (err) {
            // Skip directories we can't read (e.g. permission errors)
            skippedCount++;
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.has(entry.name)) {
                    walk(fullPath);
                }
                continue;
            }

            if (!entry.isFile()) continue;

            totalScanned++;

            const ext = path.extname(entry.name).toLowerCase();
            const language = SUPPORTED_LANGUAGES.get(ext);

            if (language) {
                files.push({
                    absolutePath: fullPath,
                    relativePath: path.relative(resolvedRoot, fullPath),
                    language,
                    extension: ext,
                });
            } else {
                skippedCount++;
            }
        }
    }

    walk(resolvedRoot);

    logger.info(
        `REPO: ${repoURL} - Scanned ${totalScanned} files in ${rootDir}. Found ${files.length} parseable files and skipped ${skippedCount} files.`
    );

    if (files.length === 0) {
        logger.warn(`REPO: ${repoURL} - No parseable files found in the repository.`);
        return;
    }

    logger.info(`REPO: ${repoURL} - Finished scanning and filtering all files.`);

    return files;
}

// // Loops through parseable files and processes them in batches to avoid overwhelming the parser with too many concurrent files. Logs progress along the way.
// export async function parseRepo(
//     repoURL: string,
//     rootDir: string
//     //parseFile: (file: ParseableFile) => Promise<void>
// ): Promise<void> {
//     const { files, skippedCount, totalScanned } = collectParseableFiles(rootDir);

//     logger.info(
//         `REPO: ${repoURL} - Scanned ${totalScanned} files in ${rootDir}. Found ${files.length} parseable files and skipped ${skippedCount} files.`
//     );

//     if (files.length === 0) {
//         logger.warn(`REPO: ${repoURL} - No parseable files found in the repository.`);
//         return;
//     }

//     // Process files concurrently in batches to avoid overwhelming the parser
//     const BATCH_SIZE = 10;

//     for (let i = 0; i < files.length; i += BATCH_SIZE) {
//         const batch = files.slice(i, i + BATCH_SIZE);
//         logger.info(
//             `REPO: ${repoURL} - Parsing batch ${i / BATCH_SIZE + 1} with ${batch.length} files.`
//         );
//         //await Promise.all(batch.map(parseFile));
//     }

//     logger.info(`REPO: ${repoURL} - Finished parsing all files.`);
// }

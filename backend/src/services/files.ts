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

export type ParseableFileType = {
    absolutePath: string;
    relativePath: string;
    fileName: string;
    language: string;
    extension: string;
};

// Recursively walks through a directory and collects files that match supported languages, while skipping ignored directories
export function collectParseableFiles(
    rootDir: string,
    repoURL: string
): ParseableFileType[] | undefined {
    const resolvedRoot = path.resolve(rootDir);

    if (!fs.existsSync(resolvedRoot)) {
        throw new NotFoundError(`Root directory does not exist: ${resolvedRoot}`);
    }

    const files: ParseableFileType[] = [];
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
                    fileName: entry.name,
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

    logger.info(`REPO: ${repoURL} - Finished scanning and filtering all files.`);

    return files;
}

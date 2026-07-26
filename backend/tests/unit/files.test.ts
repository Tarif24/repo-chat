jest.mock('../../src/config/config.js', () => ({
    appConfig: {
        repoStoragePath: '/tmp/repo-storage',
    },
}));

jest.mock('../../src/lib/logger.js', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
    },
}));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import logger from '../../src/lib/logger.js';
import {
    collectParseableFiles,
    createParseableFilesTree,
    deleteEverythingInDir,
    initializeDirectory,
} from '../../src/services/files.js';

const mockLoggerInfo = logger.info as jest.Mock;

function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'repo-chat-files-'));
}

describe('files service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.rmSync('/tmp/repo-storage', { recursive: true, force: true });
    });

    afterEach(() => {
        fs.rmSync('/tmp/repo-storage', { recursive: true, force: true });
    });

    // This checks that the configured storage directory is created when it is missing.
    it('creates the configured storage directory when it does not exist', () => {
        expect(fs.existsSync('/tmp/repo-storage')).toBe(false);

        initializeDirectory();

        expect(fs.existsSync('/tmp/repo-storage')).toBe(true);
    });

    // This checks that nested files and folders are fully removed from the target directory.
    it('deletes all nested files and folders inside the target directory', async () => {
        const targetDir = createTempDir();
        const nestedDir = path.join(targetDir, 'nested');
        fs.mkdirSync(nestedDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'root.txt'), 'root');
        fs.writeFileSync(path.join(nestedDir, 'child.ts'), 'const value = 1;');

        await deleteEverythingInDir(targetDir);

        expect(fs.existsSync(path.join(targetDir, 'root.txt'))).toBe(false);
        expect(fs.existsSync(path.join(nestedDir, 'child.ts'))).toBe(false);
        expect(fs.readdirSync(targetDir)).toEqual([]);

        fs.rmSync(targetDir, { recursive: true, force: true });
    });

    // This checks that only supported files are collected and ignored folders are skipped.
    it('collects parseable files while skipping ignored folders and unsupported extensions', () => {
        const repoDir = createTempDir();
        const srcDir = path.join(repoDir, 'src');
        const docsDir = path.join(repoDir, 'docs');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.mkdirSync(docsDir, { recursive: true });
        fs.mkdirSync(path.join(repoDir, 'node_modules', 'pkg'), { recursive: true });

        fs.writeFileSync(path.join(srcDir, 'main.ts'), 'const value = 1;');
        fs.writeFileSync(path.join(docsDir, 'guide.md'), '# docs');
        fs.writeFileSync(path.join(repoDir, 'README.txt'), 'not supported');
        fs.writeFileSync(path.join(repoDir, 'node_modules', 'pkg', 'ignored.js'), 'console.log("ignore")');

        const result = collectParseableFiles(repoDir, 'https://example.com/repo');
        const collectedFiles = result.validFiles ?? [];
        const fileNames = collectedFiles.map(file => file.fileName).sort();
        const relativePaths = collectedFiles.map(file => file.relativePath.replace(/\\/g, '/')).sort();

        expect(fileNames).toEqual(['guide.md', 'main.ts']);
        expect(relativePaths).toEqual(['docs/guide.md', 'src/main.ts']);
        expect(result.validFilesSize).toBeGreaterThan(0);
        expect(result.totalScanned).toBe(3);
        expect(result.skippedCount).toBe(1);
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            expect.stringContaining('Scanned 3 files in')
        );

        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    // This checks that the tree only includes directories and files that are parseable.
    it('builds a file tree that excludes ignored folders and unsupported files', () => {
        const repoDir = createTempDir();
        const srcDir = path.join(repoDir, 'src');
        const docsDir = path.join(repoDir, 'docs');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.mkdirSync(docsDir, { recursive: true });
        fs.mkdirSync(path.join(repoDir, 'node_modules', 'pkg'), { recursive: true });

        fs.writeFileSync(path.join(srcDir, 'main.ts'), 'const value = 1;');
        fs.writeFileSync(path.join(docsDir, 'guide.md'), '# docs');
        fs.writeFileSync(path.join(repoDir, 'README.txt'), 'not supported');
        fs.writeFileSync(path.join(repoDir, 'node_modules', 'pkg', 'ignored.js'), 'console.log("ignore")');

        const tree = createParseableFilesTree(repoDir, 'repo');

        expect(tree?.name).toBe('repo');
        expect(tree?.children?.map(child => child.name)).toEqual(expect.arrayContaining(['src', 'docs']));

        const srcNode = tree?.children?.find(child => child.name === 'src');
        expect(srcNode?.type).toBe('directory');
        expect(srcNode?.children?.map(child => child.name)).toEqual(['main.ts']);

        const docsNode = tree?.children?.find(child => child.name === 'docs');
        expect(docsNode?.type).toBe('directory');
        expect(docsNode?.children?.map(child => child.name)).toEqual(['guide.md']);

        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    // This checks that a missing root directory raises the expected error instead of silently succeeding.
    it('throws a not-found error when the root directory does not exist', () => {
        const missingDir = path.join(os.tmpdir(), 'repo-chat-missing-dir');

        expect(() => collectParseableFiles(missingDir, 'https://example.com/repo')).toThrow(
            `Root directory does not exist: ${path.resolve(missingDir)}`
        );
    });
});

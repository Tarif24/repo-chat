import Parser from 'tree-sitter';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../lib/logger.js';
import type { ParseableFileType } from './files.js';

// Language grammar imports
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import Java from 'tree-sitter-java';
import Go from 'tree-sitter-go';
import Ruby from 'tree-sitter-ruby';
import Cpp from 'tree-sitter-cpp';
import CSharp from 'tree-sitter-c-sharp';
import Html from 'tree-sitter-html';
import Css from 'tree-sitter-css';

export type CodeChunkType = {
    chunk: string; // raw source of the node
    embeddingText: string; // context header + chunk — pass this to your embedding model
    language: string;
    relativePath: string; // relativePath of the source file
    fileName: string; // name of the source file
    name: string; // function / class / selector name, or filename fallback
    type: string; // 'function' | 'class' | 'method' | 'selector' | 'file'
    parentDir: string; // immediate parent directory of the file
    startLine: number;
    endLine: number;
};

// Config constants for chunking and embedding
const CHAR_LIMIT = 2500; // text-embedding 3-small has a 8191 token limit
const SLIDING_OVERLAP = 0.15; // 15% line overlap when falling back to sliding window

// tree-sitter-typescript exposes two grammars
const TS_GRAMMAR = (TypeScript as any).typescript ?? TypeScript;
const TSX_GRAMMAR = (TypeScript as any).tsx ?? TypeScript;

function resolveGrammar(language: string, extension: string): any {
    switch (language) {
        case 'typescript':
            return extension === '.tsx' ? TSX_GRAMMAR : TS_GRAMMAR;
        case 'javascript':
            return JavaScript;
        case 'python':
            return Python;
        case 'java':
            return Java;
        case 'go':
            return Go;
        case 'ruby':
            return Ruby;
        case 'cpp':
            return Cpp;
        case 'c_sharp':
            return CSharp;
        case 'html':
            return Html;
        case 'css':
            return Css;
        default:
            return null;
    }
}

type ExtractionRule = {
    // tree-sitter node types to extract as top-level chunks
    nodeTypes: string[];
    // how to pull a human-readable name out of a matched node
    getName: (node: Parser.SyntaxNode) => string;
};

// Define the extraction rules for each supported language
const EXTRACTION_RULES: Record<string, ExtractionRule> = {
    typescript: {
        nodeTypes: [
            'function_declaration',
            'arrow_function',
            'method_definition',
            'class_declaration',
            'function_expression',
        ],
        getName: nameFromCommonPatterns,
    },
    javascript: {
        nodeTypes: [
            'function_declaration',
            'arrow_function',
            'method_definition',
            'class_declaration',
            'function_expression',
        ],
        getName: nameFromCommonPatterns,
    },
    python: {
        nodeTypes: ['function_definition', 'class_definition'],
        getName: node => node.childForFieldName('name')?.text ?? 'anonymous',
    },
    java: {
        nodeTypes: ['method_declaration', 'class_declaration', 'constructor_declaration'],
        getName: node => node.childForFieldName('name')?.text ?? 'anonymous',
    },
    go: {
        nodeTypes: ['function_declaration', 'method_declaration', 'type_declaration'],
        getName: node => node.childForFieldName('name')?.text ?? 'anonymous',
    },
    ruby: {
        nodeTypes: ['method', 'singleton_method', 'class', 'module'],
        getName: node => node.childForFieldName('name')?.text ?? 'anonymous',
    },
    cpp: {
        nodeTypes: ['function_definition', 'class_specifier'],
        getName: node => {
            // cpp declarators are nested: function_definition > declarator > ...
            const declarator = node.childForFieldName('declarator');
            return (
                declarator?.childForFieldName('declarator')?.text ??
                declarator?.text ??
                node.childForFieldName('name')?.text ??
                'anonymous'
            );
        },
    },
    c_sharp: {
        nodeTypes: [
            'method_declaration',
            'class_declaration',
            'constructor_declaration',
            'local_function_statement',
        ],
        getName: node => node.childForFieldName('name')?.text ?? 'anonymous',
    },
    // HTML & CSS don't have functions/classes — extract meaningful top-level blocks
    html: {
        nodeTypes: ['element'],
        getName: node => {
            const tag = node.child(0)?.child(1); // opening_tag > tag_name
            return tag?.text ?? 'element';
        },
    },
    css: {
        nodeTypes: ['rule_set'],
        getName: node => {
            const selector = node.childForFieldName('selectors') ?? node.child(0);
            return selector?.text?.trim() ?? 'rule';
        },
    },
};

// Shared name resolver for JS/TS — handles the variety of ways a name can appear
function nameFromCommonPatterns(node: Parser.SyntaxNode): string {
    // function foo() {}
    const directName = node.childForFieldName('name');
    if (directName) return directName.text;

    // const foo = () => {}  →  parent is variable_declarator
    const parent = node.parent;
    if (parent?.type === 'variable_declarator') {
        const id = parent.childForFieldName('name');
        if (id) return id.text;
    }

    // { foo() {} }  →  method_definition already handled by 'name' field above
    return 'anonymous';
}

// Node type → chunk type label
function chunkType(nodeType: string): string {
    if (nodeType.includes('class') || nodeType.includes('module')) return 'class';
    if (nodeType.includes('method') || nodeType.includes('constructor')) return 'method';
    if (nodeType === 'rule_set') return 'selector';
    if (nodeType === 'element') return 'element';
    return 'function';
}

// Context header builder for embedding input — combines metadata with the code chunk
function buildEmbeddingText(chunk: Omit<CodeChunkType, 'embeddingText'>): string {
    return [
        `Language: ${chunk.language}`,
        `Relative path: ${chunk.relativePath}`,
        `Parent directory: ${chunk.parentDir}`,
        `Type: ${chunk.type}`,
        `Name: ${chunk.name}`,
        `Lines: ${chunk.startLine}-${chunk.endLine}`,
        ``,
        chunk.chunk,
    ].join('\n');
}

// Chunk builder
function buildChunk(
    node: Parser.SyntaxNode,
    file: ParseableFileType,
    getName: (n: Parser.SyntaxNode) => string,
    nameOverride?: string,
    typeOverride?: string
): CodeChunkType {
    const base = {
        chunk: node.text,
        language: file.language,
        relativePath: file.relativePath,
        fileName: file.fileName,
        name: nameOverride ?? getName(node),
        type: typeOverride ?? chunkType(node.type),
        parentDir: path.basename(path.dirname(file.absolutePath)),
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
    };

    return { ...base, embeddingText: buildEmbeddingText(base) };
}

// Helper function Chunk README text by length
function chunkReadmeByLength(
    readmeText: string,
    file: {
        relativePath: string;
        fileName: string;
        absolutePath: string;
        language?: string;
    },
    limit: number = 2500 // default char limit per chunk
): CodeChunkType[] {
    const lines = readmeText.split('\n');
    const chunks: CodeChunkType[] = [];
    let buffer: string[] = [];
    let charCount = 0;
    let chunkStartLine = 1;
    let chunkIdx = 1;
    const safeAbsolutePath = file.absolutePath ?? '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (charCount + line.length + 1 > limit && buffer.length > 0) {
            // Emit chunk
            const chunkText = buffer.join('\n');
            const parentDir = path.basename(path.dirname(safeAbsolutePath));
            const base = {
                chunk: chunkText,
                language: file.language ?? 'markdown',
                relativePath: file.relativePath,
                fileName: file.fileName,
                name: `${file.fileName} (part ${chunkIdx})`,
                type: 'file',
                parentDir,
                startLine: chunkStartLine,
                endLine: chunkStartLine + buffer.length - 1,
            };
            chunks.push({ ...base, embeddingText: buildEmbeddingText(base) });
            buffer = [];
            charCount = 0;
            chunkStartLine = i + 1;
            chunkIdx++;
        }

        buffer.push(line);
        charCount += line.length + 1; // +1 for newline
    }
    // Emit last chunk
    if (buffer.length > 0) {
        const chunkText = buffer.join('\n');
        const parentDir = path.basename(path.dirname(safeAbsolutePath));
        const base = {
            chunk: chunkText,
            language: file.language ?? 'markdown',
            relativePath: file.relativePath,
            fileName: file.fileName,
            name: `${file.fileName} (part ${chunkIdx})`,
            type: 'file',
            parentDir,
            startLine: chunkStartLine,
            endLine: chunkStartLine + buffer.length - 1,
        };
        chunks.push({ ...base, embeddingText: buildEmbeddingText(base) });
    }
    return chunks;
}

// Sliding window fallback
function slidingWindowSplit(
    node: Parser.SyntaxNode,
    file: ParseableFileType,
    getName: (n: Parser.SyntaxNode) => string,
    limit: number
): CodeChunkType[] {
    const AVG_CHARS_PER_LINE = 40;
    const lines = node.text.split('\n');
    const chunkLines = Math.max(1, Math.floor(limit / AVG_CHARS_PER_LINE)); // never below 1
    const overlap = Math.floor(chunkLines * SLIDING_OVERLAP);
    const step = Math.max(1, chunkLines - overlap); // never below 1
    const baseName = getName(node);
    const results: CodeChunkType[] = [];
    let i = 0;

    while (i < lines.length) {
        const slice = lines.slice(i, i + chunkLines).join('\n');
        const partNum = results.length + 1;
        const startLine = node.startPosition.row + i + 1;
        const endLine = Math.min(startLine + chunkLines - 1, node.endPosition.row + 1);

        const base = {
            chunk: slice,
            language: file.language,
            relativePath: file.relativePath,
            fileName: file.fileName,
            name: `${baseName} (part ${partNum})`,
            type: 'fragment',
            parentDir: path.basename(path.dirname(file.absolutePath)),
            startLine,
            endLine,
        };

        results.push({ ...base, embeddingText: buildEmbeddingText(base) });
        i += step; // ← use the guarded step value
    }

    return results;
}

// Recursive split on oversized nodes
function splitOversizedNode(
    node: Parser.SyntaxNode,
    file: ParseableFileType,
    targetTypes: Set<string>,
    getName: (n: Parser.SyntaxNode) => string,
    limit: number
): CodeChunkType[] {
    // Fits within limit — emit as-is
    if (node.text.length <= limit) {
        return [buildChunk(node, file, getName)];
    }
    // Try splitting on immediate children that are themselves valid chunk types
    const childChunks: CodeChunkType[] = [];
    for (const child of node.children) {
        if (targetTypes.has(child.type)) {
            // Recurse — child might also be oversized
            childChunks.push(...splitOversizedNode(child, file, targetTypes, getName, limit));
        }
    }

    if (childChunks.length > 0) return childChunks;

    // No splittable children — sliding window as last resort
    return slidingWindowSplit(node, file, getName, limit);
}

// Recursive node walker
function extractChunks(
    node: Parser.SyntaxNode,
    file: ParseableFileType,
    targetTypes: Set<string>,
    getName: (n: Parser.SyntaxNode) => string,
    limit: number,
    results: CodeChunkType[]
): void {
    if (targetTypes.has(node.type)) {
        results.push(...splitOversizedNode(node, file, targetTypes, getName, limit));
        return;
    }

    for (const child of node.children) {
        extractChunks(child, file, targetTypes, getName, limit, results);
    }
}

// Reuse a single Parser instance across calls — instantiation is expensive
const parser = new Parser();

export function parseFile(file: ParseableFileType, limit = CHAR_LIMIT): CodeChunkType[] {
    const results: CodeChunkType[] = [];

    if (file.language === 'markdown') {
        const readmeText = fs.readFileSync(file.absolutePath, 'utf-8');
        return chunkReadmeByLength(readmeText, file, 500);
    }

    const grammar = resolveGrammar(file.language, file.extension);
    if (!grammar) {
        console.warn(`No grammar found for language: ${file.language}`);
        return [];
    }

    const sourceCode = fs.readFileSync(file.absolutePath, 'utf-8');
    parser.setLanguage(grammar);
    const tree = parser.parse(sourceCode);

    const rule = EXTRACTION_RULES[file.language];

    if (!rule) {
        const base = {
            chunk: sourceCode,
            language: file.language,
            relativePath: file.relativePath,
            fileName: file.fileName,
            name: path.basename(file.absolutePath),
            type: 'file',
            parentDir: path.basename(path.dirname(file.absolutePath)),
            startLine: 1,
            endLine: sourceCode.split('\n').length,
        };
        return [{ ...base, embeddingText: buildEmbeddingText(base) }];
    }

    const targetTypes = new Set(rule.nodeTypes);

    extractChunks(tree.rootNode, file, targetTypes, rule.getName, limit, results);

    if (results.length === 0) {
        const base = {
            chunk: sourceCode,
            language: file.language,
            relativePath: file.relativePath,
            fileName: file.fileName,
            name: path.basename(file.absolutePath),
            type: 'file',
            parentDir: path.basename(path.dirname(file.absolutePath)),
            startLine: 1,
            endLine: sourceCode.split('\n').length,
        };
        return [{ ...base, embeddingText: buildEmbeddingText(base) }];
    }

    return results;
}

export async function parseFiles(
    files: ParseableFileType[],
    repoURL: string
): Promise<CodeChunkType[]> {
    if (files.length === 0) {
        logger.warn(`REPO: ${repoURL} - No parseable files found in the repository.`);
        return [];
    }

    // Process files concurrently in batches to avoid overwhelming the parser
    const BATCH_SIZE = 10;
    const allChunks: CodeChunkType[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        logger.info(
            `REPO: ${repoURL} - Parsing batch ${i / BATCH_SIZE + 1} with ${batch.length} files.`
        );
        const batchResults = await Promise.all(batch.map(file => parseFile(file)));
        for (const chunks of batchResults) {
            allChunks.push(...chunks);
        }
    }

    logger.info(
        `REPO: ${repoURL} - Completed parsing all files. Total chunks created: ${allChunks.length}.`
    );

    return allChunks;
}

import { SearchCode, FileCode, ChevronsLeftRight } from 'lucide-react';

interface Source {
    relativePath: string;
    startLine: number;
    endLine: number;
}

interface MessageProps {
    role: 'user' | 'assistant';
    content: string;
    sources: Source[];
}

type InlineToken = {
    type: 'text' | 'bold' | 'code';
    value: string;
};

type InlineLine = InlineToken[];

type Block =
    | { kind: 'code'; lang: string; body: string }
    | { kind: 'heading'; level: number; text: string }
    | { kind: 'paragraph'; lines: InlineLine[] }
    | { kind: 'bullets'; items: InlineLine[] };

// ── Markdown-lite renderer ────────────────────────────────────────────────────

function parseInline(text: string): InlineLine {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return { type: 'bold', value: part.slice(2, -2) };
        }

        if (part.startsWith('`') && part.endsWith('`')) {
            return { type: 'code', value: part.slice(1, -1) };
        }

        return { type: 'text', value: part };
    });
}

function parseBlocks(text: string): Block[] {
    const lines = text.split('\n');
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block
        if (line.trimStart().startsWith('```')) {
            const lang = line.trim().slice(3).trim();
            const bodyLines: string[] = [];

            i++;

            while (
                i < lines.length &&
                !lines[i].trimStart().startsWith('```')
            ) {
                bodyLines.push(lines[i]);
                i++;
            }

            i++; // consume closing fence

            blocks.push({
                kind: 'code',
                lang,
                body: bodyLines.join('\n'),
            });

            continue;
        }

        // Heading
        const headingMatch = line.match(/^(#{1,3})\s+(.+)/);

        if (headingMatch) {
            blocks.push({
                kind: 'heading',
                level: headingMatch[1].length,
                text: headingMatch[2],
            });

            i++;
            continue;
        }

        // Bullets
        if (/^\s*[-*]\s+/.test(line)) {
            const items: InlineLine[] = [];

            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(parseInline(lines[i].replace(/^\s*[-*]\s+/, '')));
                i++;
            }

            blocks.push({
                kind: 'bullets',
                items,
            });

            continue;
        }

        // Blank line
        if (line.trim() === '') {
            i++;
            continue;
        }

        // Paragraph
        const paraLines: InlineLine[] = [];

        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !lines[i].trimStart().startsWith('```') &&
            !/^#{1,3}\s/.test(lines[i]) &&
            !/^\s*[-*]\s+/.test(lines[i])
        ) {
            paraLines.push(parseInline(lines[i]));
            i++;
        }

        if (paraLines.length > 0) {
            blocks.push({
                kind: 'paragraph',
                lines: paraLines,
            });
        }
    }

    return blocks;
}

function InlineContent({ line }: { line: InlineLine }) {
    return (
        <>
            {line.map((token, i) => {
                if (token.type === 'bold') {
                    return (
                        <strong
                            key={i}
                            className="font-semibold text-slate-900 dark:text-slate-50"
                        >
                            {token.value}
                        </strong>
                    );
                }

                if (token.type === 'code') {
                    return (
                        <code
                            key={i}
                            className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                        >
                            {token.value}
                        </code>
                    );
                }

                return <span key={i}>{token.value}</span>;
            })}
        </>
    );
}

function MarkdownBlocks({ text }: { text: string }) {
    const blocks = parseBlocks(text);

    return (
        <div className="flex flex-col gap-3">
            {blocks.map((block, i) => {
                if (block.kind === 'code') {
                    return (
                        <div
                            key={i}
                            className="w-fit overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700"
                        >
                            {block.lang && (
                                <div className="border-b border-gray-200 bg-gray-100 px-3 py-1.5 font-mono text-[11px] text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                    {block.lang}
                                </div>
                            )}

                            <pre className="overflow-x-auto bg-gray-50 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                                <code>{block.body}</code>
                            </pre>
                        </div>
                    );
                }

                if (block.kind === 'heading') {
                    const headingMap = {
                        1: 'h3',
                        2: 'h4',
                        3: 'h5',
                    } as const;

                    const Tag =
                        headingMap[block.level as keyof typeof headingMap];

                    const sizeClass =
                        block.level === 1 ? 'text-base' : 'text-sm';

                    return (
                        <Tag
                            key={i}
                            className={`${sizeClass} font-semibold text-slate-800 dark:text-slate-100`}
                        >
                            {block.text}
                        </Tag>
                    );
                }

                if (block.kind === 'bullets') {
                    return (
                        <ul key={i} className="flex flex-col gap-1 pl-1">
                            {block.items.map((item, j) => (
                                <li
                                    key={j}
                                    className="flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                                >
                                    {/* <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 dark:bg-blue-500" /> */}
                                    <ChevronsLeftRight className="text-blue-400 dark:text-blue-500" />
                                    <span>
                                        <InlineContent line={item} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    );
                }

                if (block.kind === 'paragraph') {
                    return (
                        <p
                            key={i}
                            className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                        >
                            {block.lines.map((line, j) => (
                                <span key={j}>
                                    <InlineContent line={line} />
                                    {j < block.lines.length - 1 && ' '}
                                </span>
                            ))}
                        </p>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ── Message Component ─────────────────────────────────────────────────────────

export default function Message({ role, content, sources }: MessageProps) {
    if (role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-gray-100 px-3.5 py-2.5 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className="flex max-w-[90%] gap-2.5 py-1">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950">
                <SearchCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
                <MarkdownBlocks text={content} />

                {sources.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                        {sources.map(source => (
                            <div
                                key={`${source.relativePath}-${source.startLine}-${source.endLine}`}
                                className="flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-xs text-gray-600 dark:border-slate-700 dark:text-slate-300"
                            >
                                <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />

                                <span className="min-w-0 truncate">
                                    {source.relativePath}
                                </span>

                                <span className="ml-auto shrink-0 text-gray-400 dark:text-slate-500">
                                    {source.startLine}–{source.endLine}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

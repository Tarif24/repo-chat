import { SearchCode, FileCode } from 'lucide-react';

// Renders an assistant message, turning `code`-like identifiers into inline code
function AssistantText({ text }: { text: string }) {
    const identifiers = ['HamburgerNav.jsx', 'NavBar.jsx'];
    const pattern = new RegExp(
        `(${identifiers.map(escapeRegExp).join('|')})`,
        'g'
    );

    return (
        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">
            {renderFormattedText(text, pattern, identifiers)}
        </p>
    );
}

function renderFormattedText(
    text: string,
    pattern: RegExp,
    identifiers: string[]
) {
    return text.split('\n').flatMap((line, lineIndex, lines) => {
        const parts = line.split(pattern);
        const renderedParts = parts.map((part, partIndex) =>
            identifiers.includes(part) ? (
                <code
                    key={`${lineIndex}-${partIndex}`}
                    className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[13px] dark:bg-slate-800 dark:text-slate-200"
                >
                    {part}
                </code>
            ) : (
                <span key={`${lineIndex}-${partIndex}`}>{part}</span>
            )
        );

        return lineIndex < lines.length - 1
            ? [...renderedParts, <br key={`br-${lineIndex}`} />]
            : renderedParts;
    });
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function Message({
    role,
    content,
    sources,
}: {
    role: string;
    content: string;
    sources: any[];
}) {
    return (
        <>
            {role === 'user' ? (
                <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg bg-gray-100 px-3.5 py-2.5 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                        {content}
                    </div>
                </div>
            ) : (
                <div className="flex max-w-[90%] gap-2.5">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950">
                        <SearchCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="mb-2.5">
                            <AssistantText text={content} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {sources.map(source => (
                                <div
                                    key={
                                        source.relativePath +
                                        source.startLine +
                                        source.endLine
                                    }
                                    className="flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-xs text-gray-600 dark:border-slate-700 dark:text-slate-300"
                                >
                                    <FileCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                    {source.relativePath}
                                    <span className="ml-auto text-gray-400 dark:text-slate-500">
                                        {source.startLine}-{source.endLine}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

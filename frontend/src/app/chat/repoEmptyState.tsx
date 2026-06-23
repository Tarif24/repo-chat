import { SearchCode, Github, ChevronDown, Loader2 } from 'lucide-react';

const SKELETON_FILES = [
    { width: 'w-20', indent: 0 },
    { width: 'w-28', indent: 1 },
    { width: 'w-16', indent: 2 },
    { width: 'w-24', indent: 2 },
    { width: 'w-20', indent: 1 },
    { width: 'w-32', indent: 1 },
    { width: 'w-16', indent: 0 },
];

const SKELETON_MESSAGES = [
    { align: 'end', width: 'w-48' },
    { align: 'start', width: 'w-64' },
    { align: 'end', width: 'w-36' },
    { align: 'start', width: 'w-56' },
];

export default function RepoEmptyState({
    repositories,
    onSelectRepo,
    isLoadingRepos = false,
}: {
    repositories: string[];
    onSelectRepo: (repo: string) => Promise<void>;
    isLoadingRepos?: boolean;
}) {
    const suggestions = repositories.slice(0, 3);

    return (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
                className="inline-flex items-center justify-end gap-2 rounded-md border border-gray-200 px-2.5 py-4 dark:border-slate-700"
                aria-hidden="true"
            >
                <Github className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-slate-600" />
                <span className="h-7 w-70 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-slate-600" />
            </div>
            <div className="flex h-full">
                {/* Ghost sidebar */}
                <aside className="flex w-55 max-w-55 min-w-55 flex-none flex-col gap-2 overflow-hidden border-r border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="mb-1.5 px-1.5 text-[15px] font-medium text-gray-300 dark:text-slate-600">
                        FILES
                    </p>
                    {SKELETON_FILES.map((file, i) => (
                        <div
                            key={i}
                            style={{ marginLeft: `${file.indent * 14}px` }}
                            className={`h-3 ${file.width} animate-pulse rounded bg-gray-200 dark:bg-slate-700`}
                        />
                    ))}
                </aside>

                {/* Ghost chat column */}
                <main className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
                    {SKELETON_MESSAGES.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.align === 'end' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`h-9 ${msg.width} animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800`}
                            />
                        </div>
                    ))}
                </main>
            </div>

            {/* Centered prompt overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] dark:bg-slate-900/70">
                <div className="flex max-w-xs flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-7 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950">
                        <SearchCode className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            Select a repository
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            Choose one from the list below to start asking
                            questions.
                        </p>
                    </div>

                    {/* Loading state */}
                    {isLoadingRepos ? (
                        <div className="flex items-center gap-2 pt-1 text-xs text-gray-400 dark:text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Fetching repositories…
                        </div>
                    ) : suggestions.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            {suggestions.map(repo => (
                                <button
                                    key={repo}
                                    onClick={() => void onSelectRepo(repo)}
                                    className="rounded-md border border-gray-200 px-2.5 py-1 font-mono text-xs text-gray-600 transition-colors hover:cursor-pointer hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    {repo
                                        .replace(
                                            /^https?:\/\/(www\.)?github\.com\//,
                                            ''
                                        )
                                        .replace(/\/$/, '')}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 pt-1 text-xs text-gray-400 dark:text-slate-500">
                            Please ingest a repo first
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

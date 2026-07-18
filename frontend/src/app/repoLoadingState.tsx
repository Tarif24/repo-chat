import { SearchCode, Check, Loader2 } from 'lucide-react';
//import { PulseLoader } from 'react-spinners';

const STAGES = [
    { key: 'cloning', label: 'Cloning repository' },
    { key: 'scanning', label: 'Scanning files' },
    { key: 'storageCheck', label: 'Checking storage limits' },
    { key: 'chunking', label: 'Chunking code' },
    {
        key: 'embeddingAndProcessing',
        label: 'Embedding and processing chunks...',
    },
] as const;

function getStageIndex(key: string | null): number {
    return STAGES.findIndex(s => s.key === key);
}

export default function RepoLoadingState({
    repoLabel,
    jobStage,
    stageDetails,
}: {
    repoLabel: string;
    jobStage: string | null;
    stageDetails: string;
}) {
    const activeIndex = getStageIndex(jobStage);

    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6">
            {/* Icon */}
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950">
                <SearchCode className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            {/* Repo name */}
            <div className="flex flex-col items-center gap-1">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Indexing
                </p>
                <p className="font-mono text-sm font-medium text-slate-800 dark:text-slate-100">
                    {repoLabel.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                </p>
            </div>
            {/* Stage list */}
            <div className="flex w-full max-w-xs flex-col gap-2">
                {STAGES.map((stage, i) => {
                    const isDone = activeIndex > i;
                    const isActive = activeIndex === i;
                    const isPending = activeIndex < i;

                    return (
                        <div
                            key={stage.key}
                            className="flex items-center gap-3"
                        >
                            {/* Step indicator */}
                            <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                    isDone
                                        ? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
                                        : isActive
                                          ? 'border-blue-500 bg-white dark:border-blue-400 dark:bg-slate-900'
                                          : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                                }`}
                            >
                                {isDone ? (
                                    <Check className="h-3 w-3 text-white dark:text-slate-900" />
                                ) : isActive ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-blue-500 dark:text-blue-400" />
                                ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
                                )}
                            </div>

                            {/* Label + details */}
                            <div className="flex min-w-0 flex-1 items-baseline gap-2">
                                <span
                                    className={`text-sm transition-colors ${
                                        isDone
                                            ? 'text-gray-400 dark:text-slate-500'
                                            : isActive
                                              ? 'font-medium text-slate-800 dark:text-slate-100'
                                              : 'text-gray-400 dark:text-slate-600'
                                    }`}
                                >
                                    {stage.label}
                                </span>
                                {isActive && stageDetails && (
                                    <span className="truncate font-mono text-xs text-blue-600 dark:text-blue-400">
                                        {stageDetails}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Shimmer bar */}
            <div className="h-1 w-56 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                <div className="h-full w-1/3 animate-[shimmer_1.6s_ease-in-out_infinite] rounded-full bg-blue-500 dark:bg-blue-400" />
            </div>

            {/* <PulseLoader color="#487aaf" loading size={8} speedMultiplier={1} /> */}

            <p className="max-w-xs text-center text-xs text-gray-400 dark:text-slate-500">
                First-time indexing can take a minute or two depending on repo
                size.
            </p>
        </div>
    );
}

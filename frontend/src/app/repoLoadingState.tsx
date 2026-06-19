import { useEffect, useState } from 'react';
import { SearchCode } from 'lucide-react';
import { PulseLoader } from 'react-spinners';

const STAGES = [
    'Cloning repository...',
    'Parsing files with Tree-sitter...',
    'Chunking by AST boundaries...',
    'Generating embeddings...',
    'Building vector index...',
];

function useCyclingStage(intervalMs = 1800) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setIndex(prev => {
                const stageIdx = Math.min(prev + 1, STAGES.length - 1);

                if (stageIdx === STAGES.length - 1) {
                    return 0;
                }

                return stageIdx;
            });
        }, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return STAGES[index];
}

export default function RepoLoadingState({ repoLabel }: { repoLabel: string }) {
    const stage = useCyclingStage();

    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950">
                <SearchCode className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex flex-col items-center gap-1.5">
                <p className="font-mono text-sm text-slate-800 dark:text-slate-100">
                    Indexing{' '}
                    <span className="text-blue-600 dark:text-blue-400">
                        {repoLabel}
                    </span>
                </p>
                <p className="font-mono text-xs text-gray-500 dark:text-slate-400">
                    {stage}
                </p>
            </div>

            <PulseLoader color="#487aaf" loading size={8} speedMultiplier={1} />

            <div className="h-1 w-56 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                <div className="h-full w-1/3 animate-[shimmer_1.6s_ease-in-out_infinite] rounded-full bg-blue-500 dark:bg-blue-400" />
            </div>

            <p className="max-w-xs text-center text-xs text-gray-400 dark:text-slate-500">
                First-time indexing can take a minute or two depending on repo
                size.
            </p>
        </div>
    );
}

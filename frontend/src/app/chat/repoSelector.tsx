import { Github, ChevronDown } from 'lucide-react';

type RepoSelectorProps = {
    repositories: string[];
    selectedRepo: string;
    onRepoChange: (e: React.ChangeEvent<HTMLSelectElement>) => Promise<void>;
};

function formatRepoLabel(repo: string) {
    return repo
        .replace(/^https?:\/\/(www\.)?github\.com\//, '')
        .replace(/\/$/, '');
}

export default function RepoSelector({
    repositories,
    selectedRepo,
    onRepoChange,
}: RepoSelectorProps) {
    return (
        <div className="relative inline-flex min-w-0 items-center">
            <Github className="pointer-events-none absolute left-2.5 z-10 h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-slate-400" />

            <select
                required
                value={selectedRepo}
                onChange={e => void onRepoChange(e)}
                className="w-full max-w-50 appearance-none truncate rounded-md border border-gray-200 bg-transparent py-1.5 pr-7 pl-8 font-mono text-[13px] text-gray-600 transition-colors hover:cursor-pointer hover:bg-gray-50 focus:ring-2 focus:ring-blue-200 focus:outline-none sm:max-w-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-blue-900"
            >
                <option
                    value=""
                    disabled
                    className="text-gray-400 dark:text-slate-500"
                >
                    Select a collection
                </option>
                {repositories.map((repo, index) => (
                    <option
                        key={index}
                        value={repo}
                        className="bg-white text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                        {formatRepoLabel(repo)}
                    </option>
                ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
        </div>
    );
}

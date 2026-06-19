'use client';

import { useState } from 'react';
import { Sparkles, ArrowRight, GitBranch, Quote, Zap } from 'lucide-react';
import { validateRepoPath } from '../helper/validateRepoPath';
import { toast } from 'react-toastify';
import RepoLoadingState from './repoLoadingState';

const EXAMPLE_REPOS = [
    'Tarif24/repo-chat',
    'facebook/react',
    'expressjs/express',
];

const FEATURES = [
    {
        icon: GitBranch,
        title: 'CST-aware chunking',
        description:
            'Code is split along real boundaries, not arbitrary line counts.',
    },
    {
        icon: Quote,
        title: 'Cited sources',
        description:
            'Every answer links back to the exact file and line range it came from.',
    },
    {
        icon: Zap,
        title: 'Cached answers',
        description:
            'Semantic caching means repeat-ish questions return instantly.',
    },
];

export default function HomePage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    const [inputText, setInputText] = useState('');
    const [currentIngestingRepo, setCurrentIngestingRepo] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationResult = validateRepoPath(inputText);
        if (!validationResult.valid) {
            toast.success(validationResult.error);
            return;
        }

        const validatedRepoURL =
            'https://github.com/' +
            validationResult.owner +
            '/' +
            validationResult.repo;

        setCurrentIngestingRepo(validatedRepoURL);

        setIsLoading(true);
        const responseJSON = await fetch(`${API_URL}/api/ingest/repo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repoUrl: validatedRepoURL,
            }),
        });
        const response = await responseJSON.json();

        if (response.message.toLowerCase().includes('openai api error')) {
            toast.success(response.data.message);
        }

        setInputText('');
        setCurrentIngestingRepo('');
        setIsLoading(false);

        if (responseJSON.ok) {
            toast.success(response.data.message);
        } else {
            toast.error(
                'Sorry the repo could not be ingested at this time please try again later'
            );
        }
    };

    return !isLoading ? (
        <div className="flex h-full flex-col bg-white transition-colors dark:bg-slate-900">
            {/* Hero */}
            <section className="flex w-full flex-1 flex-col items-center justify-center text-center">
                <div className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                    <Sparkles className="h-4 w-4" />
                    RAG-powered code search
                </div>

                <h1 className="mb-4 text-4xl font-medium text-slate-800 dark:text-slate-100">
                    Ask any GitHub repo a question
                </h1>

                <p className="mx-auto mb-7 max-w-md text-[17px] leading-relaxed text-gray-500 dark:text-slate-400">
                    Paste a repo link and get answers grounded in the actual
                    source, with file paths and line numbers, not guesses.
                </p>

                <form
                    onSubmit={e => void handleSubmit(e)}
                    className="mx-auto flex w-[50%] overflow-hidden rounded-md border border-gray-300 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-blue-900"
                >
                    <div className="flex items-center px-3 font-mono text-[13px] text-gray-600 dark:text-slate-300">
                        github.com/
                    </div>
                    <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder="vercel/next.js"
                        className="flex-1 border-none bg-transparent py-2.5 font-mono text-[13px] text-slate-800 outline-none placeholder:text-gray-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        className="flex items-center gap-1.5 border-none bg-slate-800 px-5 text-[13px] font-medium text-white transition-colors hover:cursor-pointer hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        Analyze
                        <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </form>

                <div className="mt-8 flex w-full items-center justify-center gap-2">
                    <span className="pt-1 text-sm text-gray-400 dark:text-slate-500">
                        Try:
                    </span>
                    {EXAMPLE_REPOS.map(repo => (
                        <button
                            key={repo}
                            onClick={() => setInputText(repo)}
                            className="rounded-md border border-gray-200 px-2.5 py-1 font-mono text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            {repo}
                        </button>
                    ))}
                </div>
            </section>

            {/* Feature row */}
            <section className="mx-auto mb-16 grid max-w-7xl grid-cols-1 gap-20 border-t border-gray-200 px-6 py-8 sm:grid-cols-3 dark:border-slate-700">
                {FEATURES.map(({ icon: Icon, title, description }) => (
                    <div key={title}>
                        <Icon className="mb-2 h-7 w-7 text-blue-600 dark:text-blue-400" />
                        <p className="mb-1 font-medium text-slate-800 dark:text-slate-100">
                            {title}
                        </p>
                        <p className="leading-relaxed text-gray-500 dark:text-slate-400">
                            {description}
                        </p>
                    </div>
                ))}
            </section>
        </div>
    ) : (
        <RepoLoadingState repoLabel={currentIngestingRepo} />
    );
}

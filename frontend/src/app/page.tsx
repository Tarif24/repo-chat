'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, GitBranch, Quote, Zap } from 'lucide-react';
import { validateRepoPath } from '../lib/validateRepoPath';
import { toast } from 'react-toastify';
import RepoLoadingState from './repoLoadingState';
import { useNavVisibility } from '../components/navVisibility';
import { startIngestion, startPollingIngestionStatus } from '../lib/api';

const EXAMPLE_REPOS = [
    'Tarif24/repo-chat',
    'typicode/json-server',
    'websockets/ws',
    'motdotla/dotenv',
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

function snapshotStage(
    setStageHistory: React.Dispatch<
        React.SetStateAction<Record<string, string>>
    >,
    stage: string,
    detail: string
) {
    setStageHistory(prev => ({ ...prev, [stage]: detail }));
}

export default function HomePage() {
    const [inputText, setInputText] = useState('');
    const [currentIngestingRepo, setCurrentIngestingRepo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setVisible } = useNavVisibility();
    const [jobStage, setJobStage] = useState<string | null>(null);
    const [stageDetails, setStageDetails] = useState<string>('');
    const [stageHistory, setStageHistory] = useState<Record<string, string>>(
        {}
    );

    useEffect(() => {
        setVisible(!isLoading);
    }, [isLoading, setVisible]);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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

        await startIngestion(validatedRepoURL);

        setJobStage('cloning');

        startPollingIngestionStatus(
            validatedRepoURL,
            {
                onUpdate: status => {
                    const meta = status.data.statusMeta ?? {};

                    console.log(status.data.statusStage);

                    switch (status.data.statusStage) {
                        case 'cloning':
                            setJobStage('cloning');
                            setStageDetails('Cloning repository...');
                            snapshotStage(
                                setStageHistory,
                                'cloning',
                                'Cloning repository...'
                            );
                            break;
                        case 'scanning':
                            setJobStage('scanning');
                            setStageDetails('Scanning files...');
                            break;
                        case 'scanResult':
                            setStageDetails(
                                `Found ${meta.fileCount ?? 0} parseable files (scanned ${meta.totalFileCount ?? 0})`
                            );
                            snapshotStage(
                                setStageHistory,
                                'scanning',
                                `Found ${meta.fileCount ?? 0} parseable files (scanned ${meta.totalFileCount ?? 0})`
                            );
                            break;
                        case 'storageCheck':
                            setJobStage('storageCheck');
                            setStageDetails(
                                `Estimated size: ${meta.estimateWithBufferMB ?? 0} MB`
                            );
                            snapshotStage(
                                setStageHistory,
                                'storageCheck',
                                `Estimated size: ${meta.estimateWithBufferMB ?? 0} MB`
                            );
                            break;
                        case 'chunking':
                            setJobStage('chunking');
                            setStageDetails(
                                `${meta.chunkCount ?? 0} chunks produced`
                            );
                            snapshotStage(
                                setStageHistory,
                                'chunking',
                                `${meta.chunkCount ?? 0} chunks produced`
                            );
                            break;
                        case 'embeddingAndProcessing':
                            setJobStage('embeddingAndProcessing');
                            setStageDetails(
                                `${meta.current ?? 0} / ${meta.totalChunks ?? 0} chunks embedded`
                            );
                            break;
                        case 'storing':
                            snapshotStage(
                                setStageHistory,
                                'embeddingAndProcessing',
                                stageDetails
                            );
                            setJobStage('storing');
                            setStageDetails('Writing to database...');
                            break;
                        default:
                            break;
                    }
                },
                onComplete: () => {
                    setJobStage('');
                    setStageDetails('');
                    setStageHistory({});
                    setInputText('');
                    setCurrentIngestingRepo('');
                    setIsLoading(false);
                    toast.success(
                        'Repo Successfully Ingested! You can now ask questions about it.'
                    );
                },
                onError: status => {
                    setJobStage('');
                    setStageDetails('');
                    setStageHistory({});
                    setInputText('');
                    setCurrentIngestingRepo('');
                    setIsLoading(false);
                    toast.error(
                        'Sorry the repo could not be ingested at this time please try again later'
                    );
                    if (
                        status.data.statusMessage
                            .toLowerCase()
                            .includes('openai api error')
                    ) {
                        toast.success(status.message);
                    }
                },
            },
            1000
        );
    };

    return !isLoading ? (
        <div className="flex h-full flex-col bg-white transition-colors dark:bg-slate-900">
            {/* Hero */}
            <section className="flex w-full flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-4">
                <div className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                    <Sparkles className="h-4 w-4" />
                    RAG-powered code search
                </div>

                <h1 className="mb-4 text-3xl font-medium text-slate-800 sm:text-4xl dark:text-slate-100">
                    Ask any GitHub repo a question
                </h1>

                <p className="mx-auto mb-7 max-w-md text-base leading-relaxed text-gray-500 sm:text-[17px] dark:text-slate-400">
                    Paste a repo link and get answers grounded in the actual
                    source, with file paths and line numbers, not guesses.
                </p>

                <form
                    onSubmit={e => void handleSubmit(e)}
                    className="mx-auto flex w-full max-w-xl overflow-hidden rounded-md border border-gray-300 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-blue-900"
                >
                    {/* Hide the prefix on very small screens to save space */}
                    <div className="hidden items-center px-3 font-mono text-[13px] text-gray-600 sm:flex dark:text-slate-300">
                        github.com/
                    </div>
                    <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder="owner/repo"
                        className="flex-1 border-none bg-transparent px-3 py-2.5 font-mono text-[13px] text-slate-800 outline-none placeholder:text-gray-400 sm:px-0 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        className="flex shrink-0 items-center gap-1.5 border-none bg-slate-800 px-4 text-[13px] font-medium text-white transition-colors hover:cursor-pointer hover:bg-slate-900 sm:px-5 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        Analyze
                        <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </form>

                {/* Example repo chips — wrap naturally on small screens */}
                <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-2 px-4">
                    <span className="pt-1 text-sm text-gray-400 dark:text-slate-500">
                        Try:
                    </span>
                    {EXAMPLE_REPOS.map(repo => (
                        <button
                            key={repo}
                            onClick={() => setInputText(repo)}
                            className="rounded-md border border-gray-200 px-2.5 py-1 font-mono text-xs text-gray-600 transition-colors hover:cursor-pointer hover:bg-gray-50 sm:text-sm dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            {repo}
                        </button>
                    ))}
                </div>
            </section>

            {/* Feature row */}
            <section className="mx-auto mb-12 grid w-full max-w-7xl grid-cols-1 gap-8 border-t border-gray-200 px-6 py-8 sm:mb-16 sm:grid-cols-3 sm:gap-20 dark:border-slate-700">
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
        <RepoLoadingState
            repoLabel={currentIngestingRepo}
            jobStage={jobStage}
            stageDetails={stageDetails}
            stageHistory={stageHistory}
        />
    );
}

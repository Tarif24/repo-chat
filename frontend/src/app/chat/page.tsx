'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PulseLoader } from 'react-spinners';
import { PanelLeft, X } from 'lucide-react';
import FileTree from './fileTree';
import ChatTypingBar from './chatTypingBar';
import type { FileReferenceType } from './chatTypingBar';
import Message from './message';
import RepoSelector from './repoSelector';
import RepoEmptyState from './repoEmptyState';

export default function ChatPage() {
    type MessageType = {
        role: 'user' | 'assistant' | 'system';
        content: string;
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    const [selectedRepo, setSelectedRepo] = useState<string>('');
    const [usedFiles, setUsedFiles] = useState<FileReferenceType[]>([]);
    const [repoData, setRepoData] = useState<any>(null);
    const [repositories, setRepositories] = useState<string[]>([]);
    const [chatHistory, setChatHistory] = useState<MessageType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchRepositories = async () => {
            try {
                const response = await fetch(
                    `${API_URL}/api/query/getAllRepos`
                );
                const data = await response.json();
                if (data.message.toLowerCase().includes('openai api error')) {
                    alert(data.data.message);
                }
                setRepositories(data.data.repos);
            } catch (error) {
                console.error('Error fetching repositories:', error);
            }
        };
        void fetchRepositories();
    }, [API_URL]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory]);

    const organizeMessageStructureAndSave = (messages: MessageType[]) => {
        setChatHistory(messages.map(m => ({ ...m })));
    };

    const addMessageToChatHistory = (
        chats: { role: 'user' | 'assistant' | 'system'; content: string }[]
    ) => {
        organizeMessageStructureAndSave([...chatHistory, ...chats]);
    };

    const repoSwitchHandler = async (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        await onRepoSwitch(e.target.value);
    };

    const onRepoSwitch = async (repo: string) => {
        setSelectedRepo(repo);
        setSidebarOpen(false);

        const responseJSON = await fetch(`${API_URL}/api/query/getRepoByURL`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl: repo }),
        });
        const response = await responseJSON.json();
        setRepoData(response.data.repo);
        setChatHistory([]);
    };

    return (
        <div className="flex h-full flex-col bg-white transition-colors dark:bg-slate-900">
            {repoData !== null ? (
                <>
                    {/* Top bar */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 sm:justify-end sm:px-6 dark:border-slate-700">
                        {/* Files button — mobile only */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open file tree"
                            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-100 sm:hidden dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            <PanelLeft className="h-4 w-4" />
                            <span className="text-[13px]">Files</span>
                        </button>

                        <RepoSelector
                            repositories={repositories}
                            selectedRepo={selectedRepo}
                            onRepoChange={repoSwitchHandler}
                        />
                    </div>

                    {/* Body */}
                    <div className="flex min-h-0 flex-1">
                        {/*
                         * Desktop sidebar — static, always visible on sm+
                         * Hidden on mobile; the drawer (portalled below) handles mobile.
                         */}
                        <aside className="hidden min-h-0 w-fit max-w-[30vw] min-w-55 flex-col overflow-x-hidden overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 sm:flex dark:border-slate-700 dark:bg-slate-800">
                            <p className="mb-2.5 px-1.5 text-[15px] font-medium text-gray-400 dark:text-slate-500">
                                FILES
                            </p>
                            <div className="min-h-0 overflow-x-auto font-mono text-[12.5px] text-gray-600 dark:text-slate-300">
                                <FileTree
                                    tree={repoData.fileTree}
                                    usedFiles={usedFiles.map(
                                        (ref: FileReferenceType) => ref.fileName
                                    )}
                                />
                            </div>
                        </aside>

                        {/*
                         * Mobile drawer — portalled to document.body so it escapes
                         * <main overflow-auto>, which otherwise traps position:fixed children.
                         */}
                        {typeof window !== 'undefined' &&
                            createPortal(
                                <>
                                    {/* Backdrop */}
                                    <div
                                        onClick={() => setSidebarOpen(false)}
                                        aria-hidden="true"
                                        style={{
                                            position: 'fixed',
                                            inset: 0,
                                            zIndex: 40,
                                            background: 'rgba(0,0,0,0.4)',
                                            opacity: sidebarOpen ? 1 : 0,
                                            pointerEvents: sidebarOpen
                                                ? 'auto'
                                                : 'none',
                                            transition: 'opacity 200ms',
                                        }}
                                    />
                                    {/* Drawer */}
                                    <aside
                                        style={{
                                            position: 'fixed',
                                            top: 0,
                                            left: 0,
                                            bottom: 0,
                                            width: 'fit-content',
                                            maxWidth: '90vw',
                                            zIndex: 50,
                                            transform: sidebarOpen
                                                ? 'translateX(0)'
                                                : 'translateX(-100%)',
                                            transition: 'transform 200ms',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflowY: 'auto',
                                            overflowX: 'hidden',
                                            padding: '1rem',
                                            borderRight: '1px solid',
                                        }}
                                        className="border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800"
                                    >
                                        <div className="mb-2.5 flex items-center justify-between px-1.5">
                                            <p className="text-[15px] font-medium text-gray-400 dark:text-slate-500">
                                                FILES
                                            </p>
                                            <button
                                                onClick={() =>
                                                    setSidebarOpen(false)
                                                }
                                                aria-label="Close file tree"
                                                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:text-slate-500 dark:hover:bg-slate-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="min-h-0 overflow-x-auto font-mono text-[12.5px] text-gray-600 dark:text-slate-300">
                                            <FileTree
                                                tree={repoData.fileTree}
                                                usedFiles={usedFiles.map(
                                                    (ref: FileReferenceType) =>
                                                        ref.fileName
                                                )}
                                            />
                                        </div>
                                    </aside>
                                </>,
                                document.body
                            )}

                        {/* Chat column */}
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                            <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-5">
                                <div className="flex-1" />
                                {chatHistory.map((message, idx) => (
                                    <Message
                                        key={idx}
                                        role={message.role}
                                        content={message.content}
                                        sources={usedFiles}
                                    />
                                ))}
                                <div ref={chatEndRef} />
                                <PulseLoader
                                    color="#487aaf"
                                    loading={isLoading}
                                    size={12}
                                    speedMultiplier={1}
                                    className="pl-2"
                                />
                            </div>

                            <ChatTypingBar
                                addMessageToChatHistory={
                                    addMessageToChatHistory
                                }
                                selectedRepo={selectedRepo}
                                chatHistory={chatHistory}
                                setUsedFiles={setUsedFiles}
                                setIsLoading={setIsLoading}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <RepoEmptyState
                    repositories={repositories}
                    onSelectRepo={onRepoSwitch}
                />
            )}
        </div>
    );
}

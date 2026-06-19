'use client';

import { useState, useEffect, useRef } from 'react';
import { PulseLoader } from 'react-spinners';
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

    // State to hold the selected repository name
    const [selectedRepo, setSelectedRepo] = useState<string>('');

    //const [isLoading, setIsLoading] = useState<boolean>(false);

    const [usedFiles, setUsedFiles] = useState<FileReferenceType[]>([]);

    // State to hold the repository data
    const [repoData, setRepoData] = useState<any>(null);

    const [repositories, setRepositories] = useState<string[]>([]);

    // State to hold the chat history
    const [chatHistory, setChatHistory] = useState<MessageType[]>([]);

    const [isLoading, setIsLoading] = useState(false);

    // Reference to the end of the chat history for scrolling
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Fetch the list of repositories when the component mounts
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

    // Scroll to the bottom of the chat history when a new message is added
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory]);

    const organizeMessageStructureAndSave = (messages: MessageType[]) => {
        const organizedMessages = messages.map((message: MessageType) => ({
            ...message,
        }));
        setChatHistory(organizedMessages);
    };

    const addMessageToChatHistory = (
        chats: {
            role: 'user' | 'assistant' | 'system';
            content: string;
        }[]
    ) => {
        const updatedChatHistory: {
            role: 'user' | 'assistant' | 'system';
            content: string;
        }[] = [...chatHistory, ...chats];
        organizeMessageStructureAndSave(updatedChatHistory);
    };

    const repoSwitchHandler = async (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        await onRepoSwitch(e.target.value);
    };

    const onRepoSwitch = async (repo: string) => {
        setSelectedRepo(repo);

        const responseJSON = await fetch(`${API_URL}/api/query/getRepoByURL`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repoUrl: repo,
            }),
        });
        const response = await responseJSON.json();

        setRepoData(response.data.repo);

        setChatHistory([]);
    };

    return (
        <div className="flex h-full flex-col bg-white transition-colors dark:bg-slate-900">
            {repoData !== null ? (
                <>
                    {/* Repo selector bar */}
                    <div className="flex items-center justify-end border-b border-gray-200 px-6 py-3 dark:border-slate-700">
                        <RepoSelector
                            repositories={repositories}
                            selectedRepo={selectedRepo}
                            onRepoChange={repoSwitchHandler}
                        />
                    </div>
                    <div className="hidden min-h-0 min-w-0 flex-1 lg:flex">
                        {/* Sidebar */}
                        <div className="min-w-100 flex-none overflow-auto border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                            <p className="mb-2.5 px-1.5 text-[15px] font-medium text-gray-400 dark:text-slate-500">
                                FILES
                            </p>
                            <div className="wrap-break-words min-h-0 font-mono text-[12.5px] text-gray-600 dark:text-slate-300">
                                <FileTree
                                    tree={repoData.fileTree}
                                    usedFiles={usedFiles.map(
                                        (ref: FileReferenceType) => ref.fileName
                                    )}
                                />
                            </div>
                        </div>

                        {/* Chat column */}
                        <main className="flex min-h-0 flex-1 flex-col justify-between">
                            <div className="flex min-h-0 flex-1 flex-col overflow-auto py-5 pr-2 pl-4">
                                <div className="grow" />
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
                        </main>
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

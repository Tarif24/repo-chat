'use client';

import { use, useEffect, useRef, useState } from 'react';
import Message from './message';
import ChatTypingBar from './chatTypingBar';
import FileTree from './fileTree';

export default function Chat() {
    type MessageType = {
        role: 'user' | 'assistant' | 'system';
        content: string;
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    // State to hold the selected repository name
    const [selectedRepo, setSelectedRepo] = useState<string>('');

    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [usedFiles, setUsedFiles] = useState<string[]>([]);

    // State to hold the repository data
    const [repoData, setRepoData] = useState<any>(null);

    const [repositories, setRepositories] = useState<string[]>([]);

    // State to hold the chat history
    const [chatHistory, setChatHistory] = useState<MessageType[]>([]);

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

        fetchRepositories();
    }, []);

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
        setSelectedRepo(e.target.value);

        const responseJSON = await fetch(`${API_URL}/api/query/getRepoByURL`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repoUrl: e.target.value,
            }),
        });
        const response = await responseJSON.json();

        setRepoData(response.data.repo);

        setChatHistory([]);
    };

    return (
        <div className="flex h-full items-center justify-center gap-4 border p-10">
            <div
                className={`flex h-full min-h-0 w-100 flex-col rounded-2xl border bg-gray-100 p-4 ${selectedRepo !== '' ? 'block' : 'hidden'}`}
            >
                <h2 className="mb-2 text-center text-2xl font-bold text-gray-700">
                    File Tree
                </h2>
                <div className="custom-scrollbar min-h-0 w-full flex-1 overflow-auto">
                    {repoData && repoData.fileTree && (
                        <div className="mb-4">
                            <FileTree
                                tree={repoData.fileTree}
                                usedFiles={usedFiles}
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex h-full flex-1 flex-col items-center justify-center">
                <div className="flex w-fit flex-col items-center justify-center gap-3 pt-2 sm:flex-row sm:gap-4 sm:pt-0 sm:pb-4">
                    <h1 className="text-2xl font-bold text-gray-700">
                        Repository Name
                    </h1>
                    <select
                        className="flex-1 rounded border bg-white px-3 py-2"
                        required
                        value={selectedRepo}
                        onChange={e => repoSwitchHandler(e)}
                    >
                        <option value="" disabled>
                            Select a collection
                        </option>
                        {repositories.map((repo, index) => (
                            <option key={index} value={repo}>
                                {repo
                                    .replace(
                                        /^https?:\/\/(www\.)?github\.com\//,
                                        ''
                                    )
                                    .replace(/\/$/, '')}
                            </option>
                        ))}
                    </select>
                </div>
                <div
                    className={`min-h-0 w-full flex-1 flex-col rounded-2xl border bg-gray-300 ${selectedRepo !== '' ? 'flex' : 'hidden'}`}
                >
                    <div className="flex h-full flex-col">
                        <div className="custom-scrollbar mr-1 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 pl-4">
                            <div className="grow"></div>
                            {chatHistory.map(({ role, content }, index) => {
                                return (
                                    <Message
                                        key={index}
                                        role={role}
                                        content={content}
                                    />
                                );
                            })}
                            <div ref={chatEndRef}></div>
                        </div>

                        <ChatTypingBar
                            addMessageToChatHistory={addMessageToChatHistory}
                            selectedRepo={selectedRepo}
                            chatHistory={chatHistory}
                            setUsedFiles={setUsedFiles}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

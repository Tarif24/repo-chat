'use client';

import { use, useEffect, useRef, useState } from 'react';
import Message from './message';
import ChatTypingBar from './chatTypingBar';

export default function Chat() {
    type MessageType = {
        role: string;
        message: string;
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    // State to hold the selected repository name
    const [selectedRepo, setSelectedRepo] = useState<string>('');

    const [repositories, setRepositories] = useState<string[]>([]);

    // State to hold the chat history
    const [chatHistory, setChatHistory] = useState<MessageType[]>([
        { role: 'assistant', message: 'Hello! How can I assist you today?' },
        { role: 'user', message: 'Hello! I have a question about my code.' },
        {
            role: 'assistant',
            message: 'Sure! Please go ahead and ask your question.',
        },
        { role: 'user', message: 'I am getting' },
        { role: 'assistant', message: 'Hello! How can I assist you today?' },
        { role: 'user', message: 'Hello! I have a question about my code.' },
        {
            role: 'assistant',
            message: 'Sure! Please go ahead and ask your question.',
        },
        { role: 'user', message: 'I am getting' },
        { role: 'assistant', message: 'Hello! How can I assist you today?' },
        { role: 'user', message: 'Hello! I have a question about my code.' },
        {
            role: 'assistant',
            message: 'Sure! Please go ahead and ask your question.',
        },
        { role: 'user', message: 'I am getting' },
    ]);

    // Reference to the end of the chat history for scrolling
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Fetch the list of repositories when the component mounts
        const fetchRepositories = async () => {
            try {
                const response = await fetch(`${API_URL}/query/getAllRepos`);
                const data = await response.json();
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

    const addUserMessageToChatHistory = (message: string) => {
        const updatedChatHistory = [...chatHistory, { role: 'user', message }];
        organizeMessageStructureAndSave(updatedChatHistory);
    };

    const repoSwitchHandler = async (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setSelectedRepo(e.target.value);
        //setChatHistory([]);
    };

    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-10">
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
                        {chatHistory.map(({ role, message }, index) => {
                            return (
                                <Message
                                    key={index}
                                    role={role}
                                    message={message}
                                />
                            );
                        })}
                        <div ref={chatEndRef}></div>
                    </div>

                    <ChatTypingBar
                        addUserMessageToChatHistory={
                            addUserMessageToChatHistory
                        }
                        selectedRepo={selectedRepo}
                    />
                </div>
            </div>
        </div>
    );
}

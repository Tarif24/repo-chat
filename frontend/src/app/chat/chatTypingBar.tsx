'use client';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export type FileReferenceType = {
    fileName: string;
    relativePath: string;
    startLine: number;
    endLine: number;
    name: string;
};

export default function ChatTypingBar({
    addMessageToChatHistory,
    selectedRepo,
    chatHistory,
    setUsedFiles,
    setIsLoading,
}: {
    addMessageToChatHistory: (
        chats: {
            role: 'user' | 'assistant' | 'system';
            content: string;
            usedFiles: FileReferenceType[];
        }[]
    ) => void;
    selectedRepo: string;
    chatHistory: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
    setUsedFiles: React.Dispatch<React.SetStateAction<FileReferenceType[]>>;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    const [input, setInput] = useState('');

    const submitForm = async (
        e: React.SubmitEvent<HTMLFormElement> | string
    ) => {
        if (typeof e !== 'string') {
            e.preventDefault();
        }

        addMessageToChatHistory([
            { role: 'user', content: input, usedFiles: [] },
        ]);
        setInput('');

        setIsLoading(true);

        const responseJSON = await fetch(`${API_URL}/api/query/userQuery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: input,
                repoUrl: selectedRepo,
                chatHistory: chatHistory,
            }),
        });
        const response = await responseJSON.json();

        if (response.message.toLowerCase().includes('openai api error')) {
            alert(response.data.message);
        }

        const finalResponse = response.data.message;

        if (response.data.contextStats) {
            const usedFiles = response.data.contextStats.filesReferenced;
            setUsedFiles(usedFiles);
            addMessageToChatHistory([
                { role: 'user', content: input, usedFiles: [] },
                {
                    role: 'assistant',
                    content: finalResponse,
                    usedFiles: usedFiles,
                },
            ]);
        } else {
            setUsedFiles([]);
            addMessageToChatHistory([
                { role: 'user', content: input, usedFiles: [] },
                {
                    role: 'assistant',
                    content: finalResponse,
                    usedFiles: [],
                },
            ]);
        }

        setIsLoading(false);
    };

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement> | string) => {
        if (typeof e !== 'string') {
            e.preventDefault();
        }
        void submitForm(e);
    };

    const handleOnTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height =
            e.target.scrollHeight < 150
                ? `${e.target.scrollHeight}px`
                : '150px';
    };

    return (
        <div className="flex w-full flex-col justify-center">
            <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 border-t border-gray-200 px-3 py-3 sm:gap-2.5 sm:px-6 sm:py-4 dark:border-slate-700"
            >
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-200 sm:gap-2.5 sm:px-4 sm:py-3 dark:border-slate-700 dark:focus-within:ring-blue-900">
                    <textarea
                        value={input}
                        placeholder="Ask about this repo..."
                        rows={1}
                        className="text-md min-w-0 flex-1 resize-none border-none bg-transparent text-slate-800 outline-none placeholder:text-gray-400 focus-within:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
                        onChange={e => handleOnTextChange(e)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void submitForm(input);
                            }
                        }}
                    />
                    {/* Character counter — hidden on mobile to save space */}
                    <span className="hidden shrink-0 font-mono text-[13px] text-gray-400 sm:inline dark:text-slate-500">
                        {input.length}/500
                    </span>
                </div>
                <button
                    type="submit"
                    aria-label="Send"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 transition-colors hover:cursor-pointer hover:bg-slate-900 sm:h-8.5 sm:w-8.5 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    <ArrowRight className="h-4 w-4 text-white" />
                </button>
            </form>
        </div>
    );
}

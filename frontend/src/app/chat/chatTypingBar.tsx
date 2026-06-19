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

    // State to hold the input text and typing status
    const [input, setInput] = useState('');

    // Submit form handler
    const submitForm = async (
        e: React.SubmitEvent<HTMLFormElement> | string
    ) => {
        if (typeof e !== 'string') {
            e.preventDefault();
        }

        addMessageToChatHistory([{ role: 'user', content: input }]);
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
            const usedFileNames = response.data.contextStats.filesReferenced;
            setUsedFiles(usedFileNames);
        }

        addMessageToChatHistory([
            { role: 'user', content: input },
            {
                role: 'assistant',
                content: finalResponse,
            },
        ]);

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
                className="flex items-center gap-2.5 border-t border-gray-200 px-6 py-4 dark:border-slate-700"
            >
                <div className="flex flex-1 items-center gap-2.5 rounded-md border border-gray-300 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-200 dark:border-slate-700 dark:focus-within:ring-blue-900">
                    <textarea
                        value={input}
                        placeholder="Ask about this repo..."
                        rows={1}
                        className="text-md flex-1 resize-none border-none bg-transparent text-slate-800 outline-none placeholder:text-gray-400 focus-within:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
                        onChange={e => handleOnTextChange(e)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();

                                void submitForm(input);
                            }
                        }}
                    />
                    <span className="font-mono text-[13px] text-gray-400 dark:text-slate-500">
                        {input.length}/500
                    </span>
                </div>
                <button
                    type="submit"
                    aria-label="Send"
                    className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-md bg-slate-800 transition-colors hover:cursor-pointer hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    <ArrowRight className="h-4 w-4 text-white" />
                </button>
            </form>
        </div>
    );
}

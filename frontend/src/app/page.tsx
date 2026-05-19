'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export default function Home() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    const [inputText, setInputText] = useState('');

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
    };

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const responseJSON = await fetch(`${API_URL}/api/ingest/repo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repoUrl: inputText,
            }),
        });
        const response = await responseJSON.json();

        setInputText('');
    };

    return (
        <div className="flex h-full items-center justify-center">
            <div className="flex w-[50%] flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-gray-700">
                    Enter a GitHub Repository Link
                </h1>
                <div className="mx-2 mb-2 flex h-fit w-full items-center justify-center rounded-2xl border-2 bg-white/20 backdrop-blur-2xl">
                    <form
                        className="flex w-full items-center"
                        onSubmit={e => handleSubmit(e)}
                    >
                        <input
                            type="text"
                            placeholder="Enter a repo link..."
                            className="relative h-full w-full rounded-[5rem] px-5 wrap-break-word text-black focus:outline-none"
                            value={inputText}
                            onChange={e => handleTyping(e)}
                        />
                        <button
                            className="flex h-full items-center justify-center rounded-[5rem] border-4 border-white bg-black p-3 text-white transition duration-300 ease-in-out hover:cursor-pointer hover:bg-gray-700"
                            type="submit"
                        >
                            <Send className="size-4 rounded-[5rem] sm:size-6" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

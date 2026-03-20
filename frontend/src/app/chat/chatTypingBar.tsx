'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatTypingBar({
    addUserMessageToChatHistory,
}: {
    addUserMessageToChatHistory: (message: string) => void;
}) {
    // State to hold the input text and typing status
    const [inputText, setInputText] = useState('');

    // Submit form handler
    const submitForm = async (
        e: React.SubmitEvent<HTMLFormElement> | string
    ) => {
        if (typeof e !== 'string') {
            e.preventDefault();
        }

        addUserMessageToChatHistory(inputText);
        setInputText('');
    };

    const handleOnTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);

        e.target.style.height = 'auto';
        e.target.style.height =
            e.target.scrollHeight < 150
                ? `${e.target.scrollHeight}px`
                : '150px';
    };

    return (
        <div className="flex w-full justify-center">
            <form
                className="mx-3 mb-2 flex h-fit w-full flex-col items-end justify-center rounded-full"
                onSubmit={submitForm}
            >
                <div className="flex h-fit w-full items-center justify-center rounded-2xl border-2 bg-white/20 backdrop-blur-2xl">
                    <textarea
                        value={inputText}
                        placeholder="Send a message..."
                        rows={1}
                        className="custom-scrollbar relative mr-1 h-full w-full resize-none overflow-auto rounded-2xl px-3 wrap-break-word text-black focus:outline-none"
                        onChange={e => handleOnTextChange(e)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();

                                submitForm(inputText);
                            }
                            // Shift+Enter will insert a newline by default
                        }}
                    />
                    <div className="mr-2 text-[0.8rem] text-black sm:text-[1rem]">
                        {inputText.length}/500
                    </div>
                    <button
                        className="flex h-full items-center justify-center rounded-[5rem] border-2 border-gray-300 bg-black p-3 text-white transition duration-300 ease-in-out hover:cursor-pointer hover:bg-gray-700"
                        type="submit"
                    >
                        <Send className="size-4 rounded-[5rem] sm:size-6" />
                    </button>
                </div>
            </form>
        </div>
    );
}

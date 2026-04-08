export default function Message({
    role,
    message,
}: {
    role: string;
    message: string;
}) {
    // Helper to render message with line breaks
    const renderMessageWithLineBreaks = (msg: string) =>
        msg.split('\n').map((line, idx, arr) => (
            <span key={idx}>
                {line}
                {idx < arr.length - 1 && <br />}
            </span>
        ));

    return (
        <div className="my-2 flex w-full flex-col items-end gap-2">
            {role === 'user' ? (
                <div className="flex w-full items-center gap-2 self-end">
                    <div className="flex w-full items-center gap-1">
                        <h1 className="ml-auto max-w-[70%] rounded-l-2xl rounded-tr-2xl rounded-br-2xl bg-gray-600 p-2 text-[0.8rem] wrap-break-word text-white sm:rounded-br-none sm:p-4 sm:text-[1.2rem]">
                            {renderMessageWithLineBreaks(message)}
                        </h1>
                    </div>
                </div>
            ) : (
                <div className="flex w-full items-center gap-2 self-start">
                    <div className="flex w-full items-center gap-1">
                        <h1 className="max-w-[70%] rounded-tl-2xl rounded-r-2xl rounded-bl-2xl bg-gray-600 p-2 text-[0.8rem] wrap-break-word text-white sm:rounded-bl-none sm:p-4 sm:text-[1.2rem]">
                            {renderMessageWithLineBreaks(message)}
                        </h1>
                    </div>
                </div>
            )}
        </div>
    );
}

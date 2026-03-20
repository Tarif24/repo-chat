export default function Message({
    role,
    message,
}: {
    role: string;
    message: string;
}) {
    return (
        <div className="my-2 flex w-full flex-col items-end gap-2">
            {role === 'user' ? (
                <div className="flex items-center gap-2 self-end">
                    <div className="flex items-center gap-1">
                        <h1 className="rounded-l-2xl rounded-tr-2xl rounded-br-2xl bg-gray-600 p-2 text-[0.8rem] wrap-break-word text-white sm:rounded-br-none sm:p-4 sm:text-[1.2rem]">
                            {message}
                        </h1>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 self-start">
                    <div className="flex items-center gap-1">
                        <h1 className="rounded-tl-2xl rounded-r-2xl rounded-bl-2xl bg-gray-600 p-2 text-[0.8rem] wrap-break-word text-white sm:rounded-bl-none sm:p-4 sm:text-[1.2rem]">
                            {message}
                        </h1>
                    </div>
                </div>
            )}
        </div>
    );
}

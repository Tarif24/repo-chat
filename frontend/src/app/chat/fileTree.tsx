import { Folder, File } from 'lucide-react';

export default function FileTree({
    tree,
    usedFiles,
    depth = 0,
}: {
    tree: any;
    usedFiles: string[];
    depth?: number;
}) {
    if (tree.type === 'file') {
        const isUsed = usedFiles.includes(tree.name);
        return (
            <div
                title={tree.name}
                className={`my-0.5 flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 ${
                    isUsed
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : ''
                }`}
                style={{ paddingLeft: `${depth * 16 + 6}px` }}
            >
                <File className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[14px]">
                    {tree.name}
                </span>
            </div>
        );
    }

    return (
        <div>
            {depth > 0 && (
                <div
                    title={tree.name}
                    className="flex min-w-0 items-center gap-1.5 px-1.5 py-0.5"
                    style={{ paddingLeft: `${depth * 16 + 6}px` }}
                >
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{tree.name}</span>
                </div>
            )}
            {tree.children?.map((child: any) => (
                <FileTree
                    key={child.name}
                    tree={child}
                    usedFiles={usedFiles}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
}

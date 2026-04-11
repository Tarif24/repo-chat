export default function FileTree({
    tree,
    usedFiles,
}: {
    tree: any;
    usedFiles: string[];
}) {
    if (!tree) return null;
    if (tree.type === 'file') {
        const isUsed = usedFiles.includes(tree.name);
        return (
            <div className={`pl-0 ${isUsed ? 'font-bold text-blue-600' : ''}`}>
                📄 {tree.name}
            </div>
        );
    }
    // Directory
    return (
        <div>
            <div className="font-medium">📁 {tree.name}</div>
            <div className="ml-2.5 border-l border-gray-400 pl-2">
                {Array.isArray(tree.children) && tree.children.length > 0 ? (
                    tree.children
                        .slice()
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((child: any, idx: number) => (
                            <FileTree
                                key={idx}
                                tree={child}
                                usedFiles={usedFiles}
                            />
                        ))
                ) : (
                    <div className="pl-4 text-gray-400">(empty)</div>
                )}
            </div>
        </div>
    );
}

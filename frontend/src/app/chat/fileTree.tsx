export default function FileTree({ tree }: { tree: any }) {
    if (!tree) return null;
    if (tree.type === 'file') {
        return <div className="pl-4">📄 {tree.name}</div>;
    }
    // Directory
    return (
        <div className="pl-2">
            <div className="font-medium">📁 {tree.name}</div>
            <div className="ml-3 border-l border-gray-400 pl-2">
                {Array.isArray(tree.children) && tree.children.length > 0 ? (
                    tree.children
                        .slice()
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((child: any, idx: number) => (
                            <FileTree key={idx} tree={child} />
                        ))
                ) : (
                    <div className="pl-4 text-gray-400">(empty)</div>
                )}
            </div>
        </div>
    );
}

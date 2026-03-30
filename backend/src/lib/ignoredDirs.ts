const IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '__pycache__',
    '.venv',
    'venv',
    'vendor',
    'target', // Rust/Java build output
]);

export default IGNORED_DIRS;

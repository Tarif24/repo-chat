export type RepoValidationResult =
    | { valid: true; owner: string; repo: string }
    | { valid: false; error: string };

export function validateRepoPath(rawInput: string): RepoValidationResult {
    const input = rawInput.trim();

    if (!input) {
        return { valid: false, error: 'Enter a repository to get started.' };
    }

    const path = input
        .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/^\/+|\/+$/g, '');

    const segments = path.split('/').filter(Boolean);

    if (segments.length < 2) {
        return {
            valid: false,
            error: 'Enter a full repo path, like facebook/react.',
        };
    }

    const [owner, repo] = segments;
    const validNamePattern = /^[a-zA-Z0-9._-]+$/;

    if (!validNamePattern.test(owner) || !validNamePattern.test(repo)) {
        return {
            valid: false,
            error: "That doesn't look like a valid GitHub repo path.",
        };
    }

    if (segments.length > 2) {
        return {
            valid: false,
            error: 'Paste a link to the repo itself, not a specific file or folder.',
        };
    }

    return { valid: true, owner, repo };
}

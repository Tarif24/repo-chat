const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function getAllRepos() {
    const response = await fetch(`${API_URL}/api/query/getAllRepos`);
    const data = await response.json();
    return data;
}

export async function getRepo(repo: string) {
    const responseJSON = await fetch(`${API_URL}/api/query/getRepoByURL`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoURL: repo }),
    });
    const data = await responseJSON.json();

    return data;
}

export async function startIngestion(repoURL: string) {
    try {
        const res = await fetch(`${API_URL}/api/ingest/repo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoURL }),
        });
        if (!res.ok) {
            // Eat the 504 error from api gateway timeout (30sec) so it doesn't get shown to the client
            console.warn(
                'Ingest POST returned non-OK, but ingestion is still running server-side, relying on polling'
            );
        }
    } catch (err) {
        console.warn(
            'Ingest POST failed/timed out client-side, relying on polling:',
            err
        );
    }
}

export async function getIngestionStatus(repoURL: string) {
    const res = await fetch(`${API_URL}/api/ingest/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoURL }),
    });
    const json = await res.json();
    return json; // {message: string data: { status, statusStage, statusMessage, statusMeta, statusUpdatedAt, statusHistory } }
}

export function startPollingIngestionStatus(
    repoURL: string,
    handlers: {
        onUpdate: (status: any) => void;
        onComplete: (status: any) => void;
        onError: (status: any) => void;
    },
    intervalMs = 2000
): () => void {
    let cancelled = false;

    const poll = async () => {
        if (cancelled) return;

        try {
            const status = await getIngestionStatus(repoURL);

            if (cancelled || !status) return;

            if (status.data) {
                handlers.onUpdate(status);

                if (status.data.status === 'complete') {
                    handlers.onComplete(status);
                    return;
                }
                if (status.data.status === 'error') {
                    handlers.onError(status);
                    return;
                }
            }

            if (!cancelled) {
                setTimeout(() => {
                    void poll();
                }, intervalMs);
            }
        } catch (err) {
            console.error('Error polling ingestion status:', err);
            if (!cancelled) {
                setTimeout(() => {
                    void poll();
                }, intervalMs);
            }
        }
    };

    void poll();

    // Return a cancel function so callers can stop polling on unmount.
    return () => {
        cancelled = true;
    };
}

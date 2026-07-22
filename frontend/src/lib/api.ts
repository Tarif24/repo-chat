const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function startIngestion(repoURL: string) {
    const res = await fetch(`${API_URL}/api/ingest/repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoURL }),
    });
    const json = await res.json();
    return json.data;
}

export async function getIngestionStatus(repoURL: string) {
    const res = await fetch(`${API_URL}/api/ingest/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoURL }),
    });
    const json = await res.json();
    return json; // { status, statusStage, statusMessage, statusMeta, statusUpdatedAt }
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

            handlers.onUpdate(status);

            if (status.data.status === 'complete') {
                handlers.onComplete(status);
                return;
            }
            if (status.data.status === 'error') {
                handlers.onError(status);
                return;
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

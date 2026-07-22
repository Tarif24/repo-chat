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
    repoUrl: string,
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
            const status = await getIngestionStatus(repoUrl);
            if (cancelled || !status) return;

            handlers.onUpdate(status);

            if (status.status === 'complete') {
                handlers.onComplete(status);
                return;
            }
            if (status.status === 'error') {
                handlers.onError(status);
                return;
            }

            setTimeout(poll, intervalMs);
        } catch (err) {
            if (!cancelled) setTimeout(poll, intervalMs);
        }
    };

    poll();

    // Return a cancel function so callers can stop polling on unmount.
    return () => {
        cancelled = true;
    };
}

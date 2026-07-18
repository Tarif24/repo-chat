const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function startIngestion(
    repoUrl: string
): Promise<{ jobId: string }> {
    const res = await fetch(`${API_URL}/api/ingest/repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
    });
    const json = await res.json();
    return json.data; // matches your standardResponse shape: { success, message, data }
}

export function openIngestionStream(
    jobId: string,
    handlers: {
        onCloning?: (data: any) => void;
        onScanning?: (data: any) => void;
        onStorageCheck?: (data: any) => void;
        onChunking?: (data: any) => void;
        onEmbeddingAndProcessing?: (data: any) => void;
        onStoring?: (data: any) => void;
        onComplete?: (data: any) => void;
        onError?: (data: any) => void;
    }
): EventSource {
    const source = new EventSource(`${API_URL}/api/ingest/progress/${jobId}`);

    source.addEventListener('cloning', e =>
        handlers.onCloning?.(JSON.parse(e.data))
    );
    source.addEventListener('scanning', e =>
        handlers.onScanning?.(JSON.parse(e.data))
    );
    source.addEventListener('storageCheck', e =>
        handlers.onStorageCheck?.(JSON.parse(e.data))
    );
    source.addEventListener('chunking', e =>
        handlers.onChunking?.(JSON.parse(e.data))
    );
    source.addEventListener('embeddingAndProcessing', e =>
        handlers.onEmbeddingAndProcessing?.(JSON.parse(e.data))
    );
    source.addEventListener('storing', e =>
        handlers.onStoring?.(JSON.parse(e.data))
    );
    source.addEventListener('complete', e => {
        handlers.onComplete?.(JSON.parse(e.data));
        source.close();
    });
    source.addEventListener('error', (e: any) => {
        handlers.onError?.(
            e.data ? JSON.parse(e.data) : { message: 'Connection error' }
        );
        source.close();
    });

    return source;
}

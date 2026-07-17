type SenderFn = (event: string, data: object) => void;

const registry = new Map<string, SenderFn>();

export function registerJob(jobId: string, senderFn: SenderFn): void {
    registry.set(jobId, senderFn);
}

export function getJob(jobId: string): SenderFn | undefined {
    return registry.get(jobId);
}

export function removeJob(jobId: string): void {
    registry.delete(jobId);
}

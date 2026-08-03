import type { FullConfig } from "@playwright/test";
import { request } from "@playwright/test";

const TEST_REPO_URL = "https://github.com/Tarif24/Tarif24";

const LOCAL_FRONTEND_PORT = "3000";
const LOCAL_BACKEND_PORT = "8080";

function resolveApiBaseURL(frontendBaseURL: string): string {
    const url = new URL(frontendBaseURL);

    if (url.port === LOCAL_FRONTEND_PORT) {
        // Local dev: frontend and backend run on different ports.
        return `${url.protocol}//${url.hostname}:${LOCAL_BACKEND_PORT}`;
    }

    // Prod (or anything not matching the known local port): same origin.
    return frontendBaseURL;
}

export default async function globalSetup(config: FullConfig) {
    const frontendBaseURL = config.projects[0]?.use?.baseURL;

    if (!frontendBaseURL) {
        throw new Error(
            "No baseURL found in Playwright config — check playwright.config.ts",
        );
    }

    const apiBaseURL = resolveApiBaseURL(frontendBaseURL);
    console.log(`[global-setup] Cleaning test data via ${apiBaseURL}`);

    const context = await request.newContext({ baseURL: apiBaseURL });

    try {
        const response = await context.delete(
            `/api/ingest/delete/repo?repoURL=${encodeURIComponent(TEST_REPO_URL)}`,
        );

        if (!response.ok()) {
            console.warn(
                `[global-setup] Cleanup request failed: ${response.status()} ${response.statusText()}`,
            );
        }
    } catch (err) {
        console.warn("[global-setup] Cleanup request threw an error:", err);
    } finally {
        await context.dispose();
    }
}

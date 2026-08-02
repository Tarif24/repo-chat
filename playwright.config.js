// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const baseURL =
    process.env.BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    "http://localhost:3000";

function isLocalBaseURL(url) {
    try {
        const hostname = new URL(url).hostname;
        return ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
    } catch {
        return false;
    }
}

const shouldStartWebServer = !process.env.CI && isLocalBaseURL(baseURL);

export default defineConfig({
    testDir: "./backend/tests/e2e",
    testMatch: "**/*.spec.ts",
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],

    use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "on-first-retry",
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],

    webServer: shouldStartWebServer
        ? {
              command: "npm run dev",
              url: baseURL,
              reuseExistingServer: false,
          }
        : undefined,
});

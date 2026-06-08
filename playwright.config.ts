// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    // Where Playwright looks for test files
    testDir: "./backend/tests/e2e",
    // File pattern for test files
    testMatch: "**/*.spec.ts",
    // How long each individual test can take before it is force-failed
    timeout: 60000,
    // How long each expect() assertion waits for something to appear
    // Playwright automatically retries assertions until this timeout
    expect: {
        timeout: 10000,
    },
    fullyParallel: true,
    // On CI servers, fail immediately if you try to run without installing browsers
    forbidOnly: !!process.env.CI,
    // Retry failed tests once on CI (handles flaky network conditions)
    // Do not retry locally — you want to see the failure immediately
    retries: process.env.CI ? 1 : 0,
    // Number of parallel workers
    // On CI use 1 (predictable), locally use 50% of CPU cores
    workers: process.env.CI ? 1 : undefined,
    // Output format for results
    reporter: [
        ["list"], // prints each test as it runs
        ["html", { outputFolder: "playwright-report" }], // generates an HTML report
    ],
    use: {
        // The base URL of your app — all page.goto('/chat') calls start here
        // Read from environment variable so you can point at staging or production too
        baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
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

    // This starts your frontend development server before tests run
    // and shuts it down after. Comment this out if your app is already running.
    webServer: {
        command: "cd frontend && npm run dev", // command to start your frontend
        url: "http://localhost:3000", // Playwright waits until this URL responds
        reuseExistingServer: !process.env.CI, // locally, reuse if already running
        timeout: 120000, // wait up to 2 minutes for server to start
    },
});

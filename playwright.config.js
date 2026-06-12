// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./backend/tests/e2e",
    testMatch: "**/*.spec.ts",
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],

    use: {
        baseURL: process.env.BASE_URL || "http://localhost:3000",
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

    webServer: process.env.CI
        ? undefined
        : {
              command: "npm run dev",
              url: "http://localhost:3000",
              reuseExistingServer: true,
          },
});

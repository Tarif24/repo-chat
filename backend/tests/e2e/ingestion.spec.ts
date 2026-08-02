import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial', timeout: 240000 });

test.describe('homepage ingestion flow', () => {
    // test('shows loading progress for a valid repo and navigates to /chat when ingestion completes', async ({
    //     page,
    // }) => {
    //     await page.goto('/');

    //     const input = page.getByPlaceholder('owner/repo');
    //     await expect(input).toBeVisible();

    //     const repoToIngest = 'Tarif24/Tarif24';

    //     await input.fill('https://github.com/' + repoToIngest);
    //     const analyzeButton = page.getByRole('button', { name: /analyze/i });

    //     await Promise.all([
    //         page.waitForResponse(
    //             resp => resp.url().includes('/api/ingest/repo') && resp.status() === 202,
    //             { timeout: 240000 }
    //         ),
    //         analyzeButton.click(),
    //     ]);

    //     await expect(page.getByText('Indexing', { exact: true })).toBeVisible();
    //     await expect(page.getByText(repoToIngest)).toBeVisible();

    //     await page.waitForURL(/\/chat$/, { timeout: 240000 });
    // });

    test('shows an error for an invalid repo and does not navigate', async ({ page }) => {
        await page.goto('/');

        console.log('current URL:', page.url());

        const input = page.getByPlaceholder('owner/repo');
        await input.fill('not-a-valid-repo');
        await page.getByRole('button', { name: /analyze/i }).click();

        await expect(page.getByText('Enter a full repo path, like facebook/react.')).toBeVisible();
        await expect(page).toHaveURL(/\/$/);
    });
});

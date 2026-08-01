import { test, expect } from '@playwright/test';

test.describe('homepage ingestion flow', () => {
    test('shows loading progress for a valid repo and navigates to /chat when ingestion completes', async ({
        page,
    }) => {
        await page.goto('/');

        const input = page.getByPlaceholder('owner/repo');
        await expect(input).toBeVisible();

        await input.fill('https://github.com/Tarif24/repo-chat');
        await page.getByRole('button', { name: /analyze/i }).click();

        await expect(page.getByText('Indexing', { exact: true })).toBeVisible();
        await expect(page.getByText('Tarif24/repo-chat')).toBeVisible();

        await expect(page).toHaveURL(/\/chat$/, { timeout: 180000 });
    });

    test('shows an error for an invalid repo and does not navigate', async ({ page }) => {
        await page.goto('/');

        const input = page.getByPlaceholder('owner/repo');
        await input.fill('not-a-valid-repo');
        await page.getByRole('button', { name: /analyze/i }).click();

        await expect(page.getByText('Enter a full repo path, like facebook/react.')).toBeVisible();
        await expect(page).toHaveURL(/\/$/);
    });
});

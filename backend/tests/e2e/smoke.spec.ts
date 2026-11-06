import { test, expect } from '@playwright/test';

test('Playwright is working and the frontend is reachable', async ({ page }) => {
    // Use your actual running frontend instead of an external URL
    await page.goto('/');

    // Just check the page loads — any element that always appears on your homepage
    await expect(page).toHaveTitle(/.+/); // matches any non-empty title
});

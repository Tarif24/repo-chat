import { test, expect } from '@playwright/test';

test('Playwright is working', async ({ page }) => {
    // Use your actual running frontend instead of an external URL
    await page.goto('http://localhost:3000');

    // Just check the page loads — any element that always appears on your homepage
    await expect(page).toHaveTitle(/.+/); // matches any non-empty title
});

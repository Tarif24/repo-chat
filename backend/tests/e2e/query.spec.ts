import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial', timeout: 240000 });

async function openChatForRepo(page: Page) {
    await page.goto('/');

    const repoInput = page.getByPlaceholder('owner/repo');
    await expect(repoInput).toBeVisible();

    const repoToIngest = 'Tarif24/Tarif24';

    await repoInput.fill('https://github.com/' + repoToIngest);

    const analyzeButton = page.getByRole('button', { name: /analyze/i });

    // Click analyze and wait for the backend to return 202 for ingestion start.
    await Promise.all([
        page.waitForResponse(
            resp => resp.url().includes('/api/ingest/repo') && resp.status() === 202,
            { timeout: 240000 }
        ),
        analyzeButton.click(),
    ]);

    // Wait for the ingestion UI to appear to ensure frontend progressed.
    await expect(page.getByText('Indexing', { exact: true })).toBeVisible({ timeout: 240000 });
    await expect(page.getByText(repoToIngest)).toBeVisible({ timeout: 240000 });

    // Wait for client-side navigation to /chat (more robust than immediate expect)
    await page.waitForURL(/\/chat$/, { timeout: 240000 });

    await page.getByRole('button', { name: new RegExp(repoToIngest, 'i') }).click();
    await expect(page.getByTestId('chat-input')).toBeVisible();
}

async function sendChatMessage(page: Page, message: string) {
    const input = page.getByTestId('chat-input');
    await input.fill(message);
    await page.getByTestId('chat-send-button').click();
}

test.describe('query experience', () => {
    test('shows a visible answer and referenced files for a relevant question', async ({
        page,
    }) => {
        await openChatForRepo(page);

        await sendChatMessage(page, 'What does this repository do?');

        const assistantContent = page.getByTestId('assistant-message-content').last();
        await expect(assistantContent).toContainText(/\S/, { timeout: 240000 });

        const referenceItems = page.getByTestId('assistant-message-source');
        await expect(referenceItems.first()).toBeVisible({ timeout: 240000 });
    });

    test('shows a rejection message for an irrelevant question', async ({ page }) => {
        await openChatForRepo(page);

        await sendChatMessage(page, 'What is the capital of France?');

        const assistantContent = page.getByTestId('assistant-message-content').last();
        await expect(assistantContent).toContainText(
            "Sorry, your query doesn't seem to be related to the code repository.",
            { timeout: 240000 }
        );
    });

    test('keeps both turns in chat history for two questions in the same session', async ({
        page,
    }) => {
        await openChatForRepo(page);

        await sendChatMessage(page, 'What does this repository do?');
        await expect(page.getByTestId('assistant-message-content').last()).toContainText(/\S/, {
            timeout: 240000,
        });

        // The current chat UI waits for the full backend response before rendering
        // the assistant bubble, so this assertion checks the finished rendered
        // state rather than incremental token streaming.
        await sendChatMessage(page, 'What files are most important here?');
        await expect(page.getByTestId('assistant-message-content').last()).toContainText(/\S/, {
            timeout: 240000,
        });

        await expect(page.getByTestId('user-message')).toHaveCount(2);
        await expect(page.getByTestId('assistant-message')).toHaveCount(2);
    });
});

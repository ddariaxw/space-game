import { test, expect } from '@playwright/test';

test.describe('Space Game E2E Tests', () => {
  test('should open two browser contexts and join the game room', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('http://localhost:5173');
    await page2.goto('http://localhost:5173');

    await expect(page1).toHaveTitle(/space/i);
    await expect(page2).toHaveTitle(/space/i);

    await context1.close();
    await context2.close();
  });
});
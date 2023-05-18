import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?id=projectview--create-project&viewMode=story',
  );
  // await page.getByRole('button', { name: 'Create', exact: true }).click();
});

import { test, expect } from '@playwright/test';

test('Custom serving runtimes', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-pages-customservingruntimes-customservingruntimes--default&viewMode=story',
  );
  // wait for page to load
  await page.waitForSelector('text=Serving runtimes');

  // check the platform setting labels in the header
  await expect(page.getByText('Single model serving enabled')).toBeVisible();
  await expect(page.getByText('Multi-model serving enabled')).toBeHidden();

  // check the platform labels in the table row
  await expect(page.locator('#template-1').getByLabel('Label group category')).toHaveText(
    'Single modelMulti-model',
  );
  await expect(page.locator('#template-2').getByLabel('Label group category')).toHaveText(
    'Multi-model',
  );
  await expect(page.locator('#template-3').getByLabel('Label group category')).toHaveText(
    'Single modelMulti-model',
  );
});

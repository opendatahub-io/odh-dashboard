import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Custom serving runtimes', async ({ page }) => {
  await page.goto(navigateToStory('pages-customservingruntimes-customservingruntimes', 'default'));
  // wait for page to load
  await page.waitForSelector('text=Serving runtimes');

  // check the platform setting labels in the header
  await expect(page.getByText('Single model serving enabled')).toBeVisible();
  await expect(page.getByText('Multi-model serving enabled')).toBeVisible();

  // check the platform labels in the table row
  await expect(page.locator('#template-1').getByLabel('Label group category')).toHaveText(
    'Single modelMulti-model',
  );
  await expect(page.locator('#template-2').getByLabel('Label group category')).toHaveText(
    'Single model',
  );
  await expect(page.locator('#template-3').getByLabel('Label group category')).toHaveText(
    'Multi-model',
  );
  await expect(page.locator('#template-4').getByLabel('Label group category')).toHaveText(
    'Multi-model',
  );
});

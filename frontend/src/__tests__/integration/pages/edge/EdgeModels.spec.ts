import { test } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Empty State No models in Registry', async ({ page }) => {
  await page.goto(navigateToStory('pages-edge-edgemodels', 'empty-state-no-models-in-registry'));

  // wait for page to load
  await page.waitForSelector('text=No models added');
});

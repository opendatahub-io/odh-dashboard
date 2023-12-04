import { test, expect } from '@playwright/test';
import { mockPipelineVersionsProxy } from '~/__mocks__/mockPipelineVersionsProxy';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Does not show run content', async ({ page }) => {
  await page.goto(navigateToStory('components-pipelines-pipelineselector', 'default'));

  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(10);

  // check the view more button and the label
  await expect(page.getByText(`Showing 10/${mockPipelineVersionsProxy.length}`)).toBeVisible();
  await page.getByText('View more').click();
  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(
    mockPipelineVersionsProxy.length,
  );

  // test the search
  const search = 'flip coin_';
  await page.getByLabel('Filter pipelines').fill(search);
  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(10);
  await page.getByText('View more').click();
  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(
    mockPipelineVersionsProxy.filter((version) => version.name.startsWith(search)).length,
  );
  await page.getByLabel('Filter pipelines').fill('test-no-result');
  await expect(page.getByText('No results match the filter.')).toBeVisible();
});

import { test, expect } from '@playwright/test';
import { mockPipelineVersionsList } from '~/__mocks__/mockPipelineVersionsProxy';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Pipeline version selector - Test filter and view more', async ({ page }) => {
  await page.goto(navigateToStory('components-pipelines-pipelineselector', 'default'));

  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(10);

  // check the view more button and the label
  await expect(page.getByText(`Showing 10/${mockPipelineVersionsList.length}`)).toBeVisible();
  await page.getByText('View more').click();
  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(
    mockPipelineVersionsList.length,
  );

  // test the search
  const search = 'flip coin_version_at_2023-12-01T01:41';
  await page.getByLabel('Filter pipeline versions').fill(search);
  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(4);

  await page.getByLabel('Filter pipeline versions').fill('test-no-result');
  await expect(page.getByRole('button', { name: 'Clear all filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(page.locator('[data-id="pipeline-selector-table-list-row"]')).toHaveCount(10);
  await expect(page.getByText(`Showing 10/${mockPipelineVersionsList.length}`)).toBeVisible();
});

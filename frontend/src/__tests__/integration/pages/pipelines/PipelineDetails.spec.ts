import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Test topology renders', async ({ page }) => {
  await page.goto(navigateToStory('pages-pipelines-pipelinedetails', 'default'));

  // wait for page to load
  await page.waitForSelector('text=test-pipeline');

  // check the topology renders
  const flipCoinNode = page.locator(
    '[data-id="flip-coin"][data-kind="node"][data-type="DEFAULT_TASK_NODE"]',
  );
  await expect(flipCoinNode).toBeVisible();
  const printMsgNode = page.locator(
    '[data-id="print-msg"][data-kind="node"][data-type="DEFAULT_TASK_NODE"]',
  );
  await expect(printMsgNode).toBeVisible();

  // check topology has tasks
  await printMsgNode.click();
  await expect(page.getByText('$(tasks.random-num.results.Output)')).toBeVisible();
  await page.getByLabel('Close drawer panel').click();
  await flipCoinNode.click();
  await expect(page.getByText('/tmp/outputs/Output/data')).toBeVisible();
});

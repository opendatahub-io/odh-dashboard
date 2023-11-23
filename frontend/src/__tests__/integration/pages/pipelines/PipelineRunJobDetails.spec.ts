import { test, expect } from '@playwright/test';

test('Does not show run content', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-pages-pipelines-pipelinerunjobdetails--default&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=test-pipeline-run-job-id');

  // expect run output tab not to be visible
  await expect(page.getByText('Run Output')).toHaveCount(0);

  // expect input parameters tab to be visible
  await expect(page.getByText('Input parameters')).toHaveCount(1);

  // expect output parameters tab to be visible
  await expect(page.getByText('Details')).toHaveCount(1);
  await expect(page.getByText('Started at')).toHaveCount(0);
  await expect(page.getByText('Finished at')).toHaveCount(0);
  await expect(page.getByText('Duration')).toHaveCount(0);

  // cannot stop a scheduled job
  await page.getByRole('button', { name: 'Actions' }).click();
  const dropdown = page.getByRole('menu', { name: 'Actions' });
  await expect(dropdown.getByText('Stop run')).toHaveCount(0);

  // expect nodes dont open drawer on click
  await page.getByText('flip-coin').click();
  await expect(page.getByTestId('pipeline-run-drawer-right-content')).toHaveCount(1);
});

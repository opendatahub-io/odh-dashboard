import { test } from '@playwright/test';

test('Empty project', async ({ page }) => {
  await page.goto('http://localhost:4010/');

  await page.goto('about:blank');
  await page.goto('chrome-error://chromewebdata/');
  await page.goto('http://localhost:4010/');
  await page.getByRole('link', { name: 'Data Science Projects' }).click();
  await page.getByRole('button', { name: 'Create data science project' }).click();
  await page.getByLabel('Name *', { exact: true }).fill('__test-project-name');
  await page.getByLabel('Name *', { exact: true }).click();
  await page.getByLabel('Name *', { exact: true }).fill('e2e-test-project');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: 'Data Science Projects', exact: true }).click();
  await page
    .getByRole('row', { name: 'e2e-test-project admin - - 5/26/2023, 4:17:22 PM Actions' })
    .getByRole('button', { name: 'Actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Edit project' }).click();
  await page.getByLabel('Name *', { exact: true }).fill('e2e-test-project-name');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page
    .getByRole('row', { name: 'e2e-test-project admin - - 5/26/2023, 4:17:22 PM Actions' })
    .getByRole('button', { name: 'Actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Edit project' }).click();
  await page.getByLabel('Name *', { exact: true }).click();
  await page.getByLabel('Name *', { exact: true }).fill('e2e-test-project-name');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

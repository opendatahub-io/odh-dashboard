import { test, expect } from '@playwright/test';

test.afterEach(async ({ page }) => {
  await page.goto('/projects');
  const projectTestRow = await page.locator('tr', { has: page.locator('text="e2e-test-project"') });
  const count = await projectTestRow.count();
  if (count > 0) {
    await projectTestRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete project' }).click();
    await page.getByRole('textbox', { name: 'Delete modal input' }).fill('e2e-test-project');
    await page.getByRole('button', { name: 'Delete project' }).click();
  }
});

test('Create, edit, and delete a project', async ({ page }) => {
  await page.goto('');

  // create project
  await page.getByRole('link', { name: 'Data Science Projects' }).click();
  await page.getByRole('button', { name: 'Create data science project' }).click();
  await page.getByLabel('Name *', { exact: true }).fill('e2e-test-project');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Error creating project')).toBeFalsy();
  await expect(page.locator('tr', { has: page.locator('text="e2e-test-project"') })).toBeTruthy();
  await page.getByRole('link', { name: 'Data Science Projects', exact: true }).click();

  // edit project
  await page
    .locator('tr', { has: page.locator('text="e2e-test-project"') })
    .getByRole('button', { name: 'Actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Edit project' }).click();
  await page.getByLabel('Name *', { exact: true }).fill('e2e-test-project-name');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(
    page.locator('tr', { has: page.locator('text="e2e-test-project-name"') }),
  ).toBeTruthy();

  // delete project
  await page
    .locator('tr', { has: page.locator('text="e2e-test-project"') })
    .getByRole('button', { name: 'Actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Delete project' }).click();
  await page.getByRole('textbox', { name: 'Delete modal input' }).fill('e2e-test-project');
  await page.getByRole('button', { name: 'Delete project' }).click();
  await expect(page.locator('tr', { has: page.locator('text="e2e-test-project"') })).toBeFalsy();
});

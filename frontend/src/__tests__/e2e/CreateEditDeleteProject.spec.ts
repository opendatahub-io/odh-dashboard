import { test, expect, Page } from '@playwright/test';
import { TEST_PROJECT_NAME } from './const';

const cleanTestProject = async (page: Page) => {
  await page.goto('/projects');
  const count = await page.getByRole('link', { name: TEST_PROJECT_NAME }).count();
  if (count > 0) {
    await page
      .locator('tr', {
        has: page.locator(`text="${TEST_PROJECT_NAME}"`),
      })
      .getByRole('button', { name: 'Actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete project' }).click();
    await page.getByRole('textbox', { name: 'Delete modal input' }).fill(`${TEST_PROJECT_NAME}`);
    await page.getByRole('button', { name: 'Delete project' }).click();
  }
};

test.beforeEach(async ({ page }) => await cleanTestProject(page));
test.afterEach(async ({ page }) => await cleanTestProject(page));

test('Create, edit, and delete a project', async ({ page }) => {
  await page.goto('');

  // create project
  await page.getByRole('link', { name: 'Data Science Projects' }).click();
  await page.getByRole('button', { name: 'Create data science project' }).click();
  await page.getByLabel('Name *', { exact: true }).fill(`${TEST_PROJECT_NAME}`);
  await page.getByRole('button', { name: 'Create' }).click();
  expect(await page.getByText('Error creating project').count()).toBe(0);
  expect(
    await page.locator('tr', { has: page.locator(`text="${TEST_PROJECT_NAME}"`) }).count(),
  ).toBe(0);
  await page.getByRole('link', { name: 'Data Science Projects', exact: true }).click();

  // edit project
  await page
    .locator('tr', { has: page.locator(`text="${TEST_PROJECT_NAME}"`) })
    .getByRole('button', { name: 'Actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Edit project' }).click();
  await page.getByLabel('Name *', { exact: true }).fill(`${TEST_PROJECT_NAME}-name`);
  await page.getByRole('button', { name: 'Update' }).click();
  expect(
    await page.locator('tr', { has: page.locator(`text="${TEST_PROJECT_NAME}-name"`) }).count(),
  ).toBe(0);

  // delete project
  await page
    .locator('tr', { has: page.locator(`text="${TEST_PROJECT_NAME}-name"`) })
    .getByRole('button', { name: 'Actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Delete project' }).click();
  await page.getByRole('textbox', { name: 'Delete modal input' }).fill(`${TEST_PROJECT_NAME}-name`);
  await page.getByRole('button', { name: 'Delete project' }).click();
  expect(
    await page.locator('tr', { has: page.locator(`text="${TEST_PROJECT_NAME}"`) }).count(),
  ).toBe(0);
});

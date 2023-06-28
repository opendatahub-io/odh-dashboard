import { test, expect } from '@playwright/test';

test('Create project', async ({ page }) => {
  await page.goto(
    './iframe.html?id=tests-integration-pages-projects-projectview--create-project&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Create data science project');

  // Test that can submit on valid form
  await page.getByLabel('Name *', { exact: true }).click();
  await page.getByLabel('Name *', { exact: true }).fill('Test Project');
  await page.getByLabel('Description').click();
  await page.getByLabel('Description').fill('Test project description');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();

  // Test invalid resource name
  await page.getByLabel('Resource name *').fill('test project');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

  await page.getByLabel('Resource name *').fill('test_project');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

  await page.getByLabel('Resource name *').fill('-test-project-');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

  await page.getByLabel('Resource name *').fill('123test-project123');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();

  await page.getByLabel('Resource name *').fill('%^&test-project@#$');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

  await page.getByLabel('Resource name *').fill('test.project');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

  await page.getByLabel('Resource name *').fill('test-project');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();

  // Test incomplete form
  await page.getByLabel('Name *', { exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

  await page.getByLabel('Name *', { exact: true }).fill('New Name');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();

  await page.getByLabel('Resource name *').fill('');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

  await page.getByLabel('Resource name *').fill('new-name');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();
});

test('Edit project', async ({ page }) => {
  await page.goto(
    './iframe.html?id=tests-integration-pages-projects-projectview--edit-project&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Edit data science project');

  // Test that can submit on valid form
  await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled();

  // Test incomplete form
  await page.getByLabel('Name *', { exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Update' })).toBeDisabled();

  await page.getByLabel('Name *', { exact: true }).fill('New Name');
  await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled();
});

test('Delete project', async ({ page }) => {
  await page.goto(
    './iframe.html?id=tests-integration-pages-projects-projectview--delete-project&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Delete project?');

  // Test that can submit on valid form
  await expect(page.getByRole('button', { name: 'Delete project' })).toBeDisabled();

  await page.getByRole('textbox', { name: 'Delete modal input' }).fill('Test Project');
  await expect(page.getByRole('button', { name: 'Delete project' })).toBeEnabled();
});

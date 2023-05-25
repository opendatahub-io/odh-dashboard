import { test, expect } from '@playwright/test';

const testInvalidResourceName = async (page, resourceName, buttonName) => {
  await page.getByLabel(resourceName).fill('test project');
  await expect(page.getByRole('button', { name: buttonName })).toBeDisabled();

  await page.getByLabel(resourceName).fill('test_project');
  await expect(page.getByRole('button', { name: buttonName })).toBeDisabled();

  await page.getByLabel(resourceName).fill('-test-project-');
  await expect(page.getByRole('button', { name: buttonName })).toBeDisabled();

  await page.getByLabel(resourceName).fill('123test-project123');
  await expect(page.getByRole('button', { name: buttonName })).toBeEnabled();

  await page.getByLabel(resourceName).fill('%^&test-project@#$');
  await expect(page.getByRole('button', { name: buttonName })).toBeDisabled();

  await page.getByLabel(resourceName).fill('test.project');
  await expect(page.getByRole('button', { name: buttonName })).toBeDisabled();

  await page.getByLabel(resourceName).fill('test-project');
  await expect(page.getByRole('button', { name: buttonName })).toBeEnabled();
};

test('Create project', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?id=tests-stories-pages-projects-projectview--create-project&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Create data science project');

  // Test that can submit on valid form
  await page.getByLabel('Name *', { exact: true }).click();
  await page.getByLabel('Name *', { exact: true }).fill('Test Project');
  await page.getByLabel('Description').click();
  await page.getByLabel('Description').fill('Test project description');
  await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();

  // Test invalid resource name
  await testInvalidResourceName(page, 'Resource name *', 'Create');

  // Test incomplete form
  await page.getByLabel('Name *', { exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled();

  await page.getByLabel('Name *', { exact: true }).fill('New Name');
  await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();

  await page.getByLabel('Resource name *').fill('');
  await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled();

  await page.getByLabel('Resource name *').fill('new-name');
  await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();
});

test('Edit project', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?id=tests-stories-pages-projects-projectview--edit-project&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Edit data science project');

  // Test that can submit on valid form
  await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled();

  // Test invalid resource name
});

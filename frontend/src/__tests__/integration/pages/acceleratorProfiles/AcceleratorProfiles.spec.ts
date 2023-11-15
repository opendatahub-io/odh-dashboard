import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Empty State no Accelerator profile', async ({ page }) => {
  await page.goto(
    navigateToStory(
      'pages-acceleratorprofiles-acceleratorprofiles',
      'empty-state-no-accelerator-profile',
    ),
  );

  // wait for page to load
  await page.waitForSelector('text=No available accelerator profiles yet');

  // Test that the button is enabled
  await expect(page.getByRole('button', { name: 'Add new accelerator profile' })).toBeEnabled();
});

test('List Accelerator profiles', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-acceleratorprofiles-acceleratorprofiles', 'list-accelerator-profiles'),
  );

  // wait for page to load
  await page.waitForSelector('text=Accelerator profiles');

  // Check for name
  expect(page.getByText('TensorRT')).toBeTruthy();
  expect(page.getByText('Test Accelerator')).toBeTruthy();

  // Check for description
  expect(
    page.getByText('Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis'),
  ).toBeTruthy();
  expect(page.getByText('Test description')).toBeTruthy();

  // Check for identifier
  expect(page.getByText('tensor.com/gpu')).toBeTruthy();
  expect(page.getByText('nvidia.com/gpu')).toBeTruthy();

  // Check column sorting by identifier
  await page
    .locator('th:has-text("Identifier")')
    .getByRole('button', { name: 'Identifier', exact: true })
    .click();
  const tableBodyLocator = await page.locator('table#accelerator-profile-table tbody');
  const firstRowIdentifier = await tableBodyLocator
    .locator('tr')
    .nth(0)
    .locator('td:nth-child(2)')
    .allInnerTexts();
  await expect(firstRowIdentifier[0]).toBe('nvidia.com/gpu');

  // Check create button
  expect(page.getByRole('button', { name: 'Create accelerator profile' })).toBeTruthy();

  // Check filters
  // by name
  expect(page.getByRole('button', { name: 'Options menu' })).toBeTruthy();
  await page.getByLabel('Search input').fill('TensorRT');
  expect(page.getByText('TensorRT'));

  // by identifier
  await page.getByRole('button', { name: 'Reset' }).click();
  page.getByRole('button', { name: 'Options menu' }).click();
  await page.getByRole('option', { name: 'Identifier' }).click();
  await page.getByLabel('Search input').fill('tensor.com/gpu');
  expect(page.getByText('tensor.com/gpu'));
});

test('Delete Accelerator profile', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-acceleratorprofiles-acceleratorprofiles', 'list-accelerator-profiles'),
  );
  await page
    .getByRole('row', {
      name: 'Test Accelerator',
    })
    .getByRole('button', { name: 'Actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('button', { name: 'Delete accelerator profile' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Delete modal input' }).fill('Test Accelerator');
  await expect(page.getByRole('button', { name: 'Delete accelerator profile' })).toBeEnabled();
  await page.getByRole('button', { name: 'Delete accelerator profile' }).click();
  expect(page.getByRole('heading', { name: 'Danger alert: Error deleting Test Accelerator' }));
});

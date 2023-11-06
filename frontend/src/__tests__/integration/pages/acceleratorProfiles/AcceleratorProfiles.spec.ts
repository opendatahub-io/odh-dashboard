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
});

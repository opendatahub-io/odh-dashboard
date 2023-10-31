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

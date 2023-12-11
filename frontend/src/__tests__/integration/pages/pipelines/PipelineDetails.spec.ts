import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('page details are updated when a new pipeline version is selected', async ({ page }) => {
  await page.goto(navigateToStory('pages-pipelines-pipelinedetails', 'default'));
  await page.waitForSelector('[data-testid="pipeline-version-topology-content"]');

  const toggleButtonInput = await page.getByTestId('pipeline-version-toggle-button');

  // Verify default version is selected and visible by default
  await expect(toggleButtonInput).toHaveText('Pipeline version: version-1');

  await toggleButtonInput.click();
  await page
    .locator('[data-id="pipeline-selector-table-list-row"]', { hasText: 'version-2' })
    .click();

  // Verify new version is selected and visible after selection
  await expect(toggleButtonInput).toHaveText('Pipeline version: version-2');
});

test('page details are updated after uploading a new version', async ({ page }) => {
  const newVersionName = 'new-upload-version';

  await page.goto(navigateToStory('pages-pipelines-pipelinedetails', 'default'));
  await page.waitForSelector('[data-testid="pipeline-version-topology-content"]');

  const toggleButtonInput = await page.getByTestId('pipeline-version-toggle-button');

  // Verify default version is selected and visible by default
  await expect(toggleButtonInput).toHaveText('Pipeline version: version-1');

  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Upload new version' }).click();

  const versionNameInput = await page.getByLabel('Pipeline version name');
  await versionNameInput.clear();
  await versionNameInput.fill(newVersionName);

  // Simulate file upload
  await page.setInputFiles(
    '[data-testid="pipeline-file-upload"] input[type="file"]',
    './src/__mocks__/mock-upload-pipeline-version.yaml',
  );

  const submitButton = await page.getByTestId('upload-version-submit-button');
  await submitButton.click();
  await page.waitForSelector('[data-testid="upload-version-modal"]', { state: 'hidden' });

  // Verify new version is selected and visible after selection
  await expect(toggleButtonInput).toHaveText(`Pipeline version: ${newVersionName}`);
});

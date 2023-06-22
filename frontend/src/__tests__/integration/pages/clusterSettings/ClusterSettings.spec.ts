import { test, expect } from '@playwright/test';

test('Cluster settings', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-pages-clustersettings-clustersettings--default&viewMode=story',
  );
  // wait for page to load
  await page.waitForSelector('text=Save changes');
  const submitButton = page.locator('[data-id="submit-cluster-settings"]');
  // check PVC size field
  const pvcInputField = page.locator('[data-id="pvc-size-input"]');
  const pvcHint = page.locator('[data-id="pvc-size-helper-text"]');
  await pvcInputField.clear();
  await pvcInputField.type('10', { delay: 50 });
  await expect(submitButton).toBeEnabled();
  await pvcInputField.clear();
  await expect(submitButton).toBeDisabled();
  await expect(pvcHint).toHaveClass(/pf-m-error/);
  await page.locator('[data-id="restore-default-button"]').click();
  await expect(pvcHint).toHaveClass(/pf-m-indeterminate/);

  // check culler field
  const cullerHint = page.locator('[data-id="culler-timeout-helper-text"]');
  await page.locator('[data-id="culler-timeout-limited"]').click();
  await expect(submitButton).toBeEnabled();
  await page.locator('[data-id="hour-input"]').clear();
  await expect(submitButton).toBeDisabled();
  await expect(cullerHint).toHaveClass(/pf-m-error/);
  await page.locator('[data-id="minute-input"]').type('20', { delay: 50 });
  await expect(submitButton).toBeEnabled();
  await expect(cullerHint).toHaveClass(/pf-m-indeterminate/);
  await page.locator('[data-id="culler-timeout-unlimited"]').click();
  await expect(submitButton).toBeDisabled();

  // check user tracking field
  const telemetryCheckbox = page.locator('[data-id="usage-data-checkbox"]');
  await telemetryCheckbox.click();
  await expect(submitButton).toBeEnabled();
  await telemetryCheckbox.click();
  await expect(submitButton).toBeDisabled();

  // check notebook toleration field
  const tolerationKeyInput = page.locator('[data-id="toleration-key-input"]');
  const tolerationError = page.locator('[data-id="toleration-helper-text-error"]');
  await expect(tolerationError).toBeHidden();
  await tolerationKeyInput.clear();
  await expect(tolerationError).toBeVisible();
  await expect(submitButton).toBeDisabled();
  await tolerationKeyInput.type('NotebooksOnlyChange', { delay: 50 });
  await expect(tolerationError).toBeHidden();
  await page.locator('[data-id="tolerations-enabled-checkbox"]').click();
  await expect(submitButton).toBeEnabled();
});

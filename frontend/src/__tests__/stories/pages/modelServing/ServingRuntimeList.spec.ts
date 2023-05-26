import { test, expect } from '@playwright/test';

test('Deploy model', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?args=&id=tests-stories-pages-modelserving-servingruntimelist--deploy-model&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Deploy model');

  // test that you can not submit on empty
  await expect(await page.getByRole('button', { name: 'Deploy' })).toBeDisabled();

  // test filling in minimum required fields
  await page.getByLabel('Model Name *').fill('Test Name');
  await page.locator('#inference-service-framework-selection').click();
  await page.getByRole('option', { name: 'onnx - 1' }).click();
  await expect(await page.getByRole('button', { name: 'Deploy' })).toBeDisabled();
  await page
    .getByRole('group', { name: 'Model location' })
    .getByRole('button', { name: 'Options menu' })
    .click();
  await page.getByRole('option', { name: 'Test Secret' }).click();
  await expect(await page.getByRole('button', { name: 'Deploy' })).toBeEnabled();
  await page.getByText('New data connection').click();
  await expect(await page.getByRole('button', { name: 'Deploy' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Field list Name' }).fill('Test Name');
  await page.getByRole('textbox', { name: 'Field list AWS_ACCESS_KEY_ID' }).fill('test-key');
  await page
    .getByRole('textbox', { name: 'Field list AWS_SECRET_ACCESS_KEY' })
    .fill('test-secret-key');
  await expect(await page.getByRole('button', { name: 'Deploy' })).toBeEnabled();
});

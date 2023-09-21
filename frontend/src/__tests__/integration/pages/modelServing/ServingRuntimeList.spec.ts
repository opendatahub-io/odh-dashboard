import { test, expect } from '@playwright/test';

test('Deploy model', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-pages-modelserving-servingruntimelist--deploy-model&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Deploy model');

  // test that you can not submit on empty
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();

  // test filling in minimum required fields
  await page.getByLabel('Model Name *').fill('Test Name');
  await page.locator('#inference-service-framework-selection').click();
  await page.getByRole('option', { name: 'onnx - 1' }).click();
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
  await page
    .getByRole('group', { name: 'Model location' })
    .getByRole('button', { name: 'Options menu' })
    .click();
  await page.getByRole('option', { name: 'Test Secret' }).click();
  await page.getByLabel('Path').fill('test-model/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
  await page.getByText('New data connection').click();
  await page.getByLabel('Path').fill('');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Field list Name' }).fill('Test Name');
  await page.getByRole('textbox', { name: 'Field list AWS_ACCESS_KEY_ID' }).fill('test-key');
  await page
    .getByRole('textbox', { name: 'Field list AWS_SECRET_ACCESS_KEY' })
    .fill('test-secret-key');
  await page.getByRole('textbox', { name: 'Field list AWS_S3_ENDPOINT' }).fill('test-endpoint');
  await page.getByLabel('Path').fill('test-model/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
});

test('Legacy Serving Runtime', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-pages-modelserving-servingruntimelist--list-available-models&viewMode=story',
  );

  // wait for page to load
  await page.waitForSelector('text=Add server');

  // Check that the legacy serving runtime is shown with the default runtime name
  expect(page.getByText('ovms')).toBeTruthy();

  // Check that the legacy serving runtime displays the correct Serving Runtime
  expect(page.getByText('OpenVINO Model Server')).toBeTruthy();

  // Check that the legacy serving runtime has tokens disabled
  expect(page.getByText('Tokens disabled')).toBeTruthy();

  // Check that the serving runtime is shown with the default runtime name
  expect(page.getByText('OVMS Model Serving')).toBeTruthy();

  // Check that the serving runtime displays the correct Serving Runtime
  expect(page.getByText('OpenVINO Serving Runtime (Supports GPUs)')).toBeTruthy();

  // Get the first and second row
  const firstButton = page.getByRole('button', { name: 'ovms', exact: true });
  const secondButton = page.getByRole('button', { name: 'OVMS Model Serving', exact: true });
  const firstRow = page.getByRole('rowgroup').filter({ has: firstButton });
  const secondRow = page.getByRole('rowgroup').filter({ has: secondButton });

  // Check that both of the rows are not expanded
  await expect(firstRow).not.toHaveClass('pf-m-expanded');
  await expect(secondRow).not.toHaveClass('pf-m-expanded');

  await firstButton.click();

  // Check that the first row is expanded while the second is not
  await expect(firstRow).toHaveClass('pf-m-expanded');
  await expect(secondRow).not.toHaveClass('pf-m-expanded');
});

import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Empty State No Serving Runtime', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-modelservingglobal', 'empty-state-no-serving-runtime'),
  );

  // wait for page to load
  await page.waitForSelector('text=No deployed models yet');

  // Test that the button is enabled
  await expect(page.getByRole('button', { name: 'Go to Test Project' })).toBeTruthy();
});

test('Empty State No Inference Service', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-modelservingglobal', 'empty-state-no-inference-services'),
  );

  // wait for page to load
  await page.waitForSelector('text=No deployed models');

  // Test that the button is enabled
  await page.getByRole('button', { name: 'Deploy model' }).click();

  // test that you can not submit on empty
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
});

test('No serving platform installed', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-modelservingglobal', 'no-platform-installed'),
  );

  // wait for page to load
  await page.waitForSelector('text=Problem loading model serving page');

  // Test that the button is enabled
  await page.getByRole('button', { name: 'View my projects' }).isEnabled();

  // test that you can not submit on empty
  await expect(await page.getByText('No model serving platform installed')).toBeVisible();
});

test('Delete model', async ({ page }) => {
  await page.goto(navigateToStory('pages-modelserving-modelservingglobal', 'delete-model'));

  // wait for page to load
  await page.waitForSelector('text=Delete deployed model?');

  // Test that can submit on valid form
  await expect(page.getByRole('button', { name: 'Delete deployed model' })).toBeDisabled();

  await page.getByRole('textbox', { name: 'Delete modal input' }).fill('Test Inference Service');
  await expect(page.getByRole('button', { name: 'Delete deployed model' })).toBeEnabled();

  await page.getByRole('textbox', { name: 'Delete modal input' }).fill('Name with trailing space ');
  await expect(page.getByRole('button', { name: 'Delete deployed model' })).toBeDisabled();
});

test('Edit model', async ({ page }) => {
  await page.goto(navigateToStory('pages-modelserving-modelservingglobal', 'edit-model'));

  // wait for page to load
  await page.waitForSelector('text=Deployed models');

  // test that you can not submit on empty
  await await page.getByLabel('Model Name *').fill('');
  await await page.getByLabel('Path').fill('');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
  await await page.getByLabel('Path').fill('/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
  // test that you can update the name to a different name
  await await page.getByLabel('Model Name *').fill('Updated Model Name');
  await await page.getByLabel('Path').fill('test-model/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();

  // test that user cant upload on an empty new secret
  await page.getByText('New data connection').click();
  await await page.getByLabel('Path').fill('');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
  await await page.getByLabel('Path').fill('/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();

  // test that adding required values validates submit
  await page.getByRole('textbox', { name: 'Field list Name' }).fill('Test Name');
  await page.getByRole('textbox', { name: 'Field list AWS_ACCESS_KEY_ID' }).fill('test-key');
  await page
    .getByRole('textbox', { name: 'Field list AWS_SECRET_ACCESS_KEY' })
    .fill('test-secret-key');
  await page.getByRole('textbox', { name: 'Field list AWS_S3_ENDPOINT' }).fill('test-endpoint');
  await page.getByRole('textbox', { name: 'Field list AWS_S3_BUCKET' }).fill('test-bucket');
  await page.getByLabel('Path').fill('test-model/');
  await expect(page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
});

test('Create model', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-modelservingglobal', 'deploy-model-model-mesh'),
  );

  // wait for page to load
  await page.waitForSelector('text=Deploy model');

  // test that you can not submit on empty
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();

  // test filling in minimum required fields
  await page.getByLabel('Model Name *').fill('Test Name');
  await page.locator('#inference-service-model-selection').click();
  await page.getByRole('option', { name: 'ovms' }).click();
  await expect(page.getByText('Model framework (name - version)')).toBeTruthy();
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
  await page.getByLabel('Path').fill('/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Field list Name' }).fill('Test Name');
  await page.getByRole('textbox', { name: 'Field list AWS_ACCESS_KEY_ID' }).fill('test-key');
  await page
    .getByRole('textbox', { name: 'Field list AWS_SECRET_ACCESS_KEY' })
    .fill('test-secret-key');
  await page.getByRole('textbox', { name: 'Field list AWS_S3_ENDPOINT' }).fill('test-endpoint');
  await page.getByRole('textbox', { name: 'Field list AWS_S3_BUCKET' }).fill('test-bucket');
  await page.getByLabel('Path').fill('test-model/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
});

test('Insufficient resources due to failed Pod scheduling', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-modelservingglobal', 'insufficient-resources-error'),
  );
  // hover over the icon
  await page.getByLabel('error icon').hover();
  await expect(page.getByText('Insufficient resources')).toBeVisible();
});

test('Create model error', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-modelservingglobal', 'deploy-model-model-mesh'),
  );

  // wait for page to load
  await page.waitForSelector('text=Deploy model');

  // test that you can not submit on empty
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();

  // test filling in minimum required fields
  await page.getByLabel('Model Name *').fill('trigger-error');
  await page.locator('#inference-service-model-selection').click();
  await page.getByRole('option', { name: 'ovms' }).click();
  await expect(page.getByText('Model framework (name - version)')).toBeTruthy();
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
  await page.getByLabel('Path').fill('test-model/');
  await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();

  // Check the model name character limit (within 253)
  await page
    .getByLabel('Model Name *')
    .fill(
      'eget nunc scelerisque viverra mauris in aliquam sem fringilla ut morbi tincidunt augue interdum velit euismod in pellentesque massa placerat duis ultricies lacus sed turpis tincidunt id aliquet risus feugiat in ante metus dictum at tempor commodo ullafff',
    ); // 254 char name
  await expect(await page.getByRole('button', { name: 'Deploy' })).toBeDisabled();
  await page.getByLabel('Model Name *').fill('trigger-error');
  await expect(await page.getByRole('button', { name: 'Deploy' })).toBeEnabled();

  // Submit and check the invalid error message
  await page.getByRole('button', { name: 'Deploy', exact: true }).click();
  await page.waitForSelector('text=Error creating model server');

  // Close the modal
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  // Check that the error message is gone
  await page.getByRole('button', { name: 'Deploy model', exact: true }).click();
  expect(await page.isVisible('text=Error creating model server')).toBeFalsy();
});

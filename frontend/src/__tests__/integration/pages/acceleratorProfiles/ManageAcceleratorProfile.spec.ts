import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Create accelerator profile', async ({ page }) => {
  await page.goto(
    navigateToStory(
      'pages-acceleratorprofiles-manageacceleratorprofile',
      'new-accelerator-profile',
    ),
  );

  // wait for page to load
  await page.waitForSelector('text=Details');

  // test required fields
  await expect(page.getByTestId('accelerator-profile-create-button')).toBeDisabled();
  await page.getByTestId('accelerator-name-input').fill('Test Name');
  await expect(page.getByTestId('accelerator-profile-create-button')).toBeDisabled();
  await page.getByTestId('accelerator-identifier-input').fill('test.com/gpu');
  await expect(page.getByTestId('accelerator-profile-create-button')).toBeEnabled();

  // test tolerations
  await expect(page.getByTestId('tolerations-modal-empty-state')).toBeTruthy();

  // open modal
  await page.getByTestId('add-toleration-button').click();

  // fill in form required fields
  await expect(page.getByTestId('modal-submit-button')).toBeDisabled();
  await page.getByTestId('toleration-key-input').fill('test-key');
  await expect(page.getByTestId('modal-submit-button')).toBeEnabled();

  // test value info warning when operator is Exists
  await page.getByTestId('toleration-value-input').fill('test-value');
  await expect(page.getByTestId('toleration-value-alert')).toBeTruthy();
  await page.getByRole('button', { name: 'Equal' }).click();
  await page
    .getByRole('menuitem', {
      name: 'Equal A toleration "matches" a taint if the keys are the same, the effects are the same, and the values are equal.',
    })
    .click();
  await expect(page.getByTestId('toleration-value-alert')).toHaveCount(0);

  // test toleration seconds warning when effect is not NoExecute
  await page.getByTestId('toleration-seconds-radio-custom').check();
  await expect(page.getByTestId('toleration-seconds-alert')).toHaveCount(1);
  await page.getByRole('button', { name: 'None' }).click();
  await page
    .getByRole('menuitem', {
      name: 'NoExecute Pods will be evicted from the node if they do not tolerate the taint.',
    })
    .click();
  await expect(page.getByTestId('toleration-seconds-alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Plus' }).click();

  // test adding toleration
  await page.getByTestId('modal-submit-button').click();

  // test that values were added correctly
  await expect(page.getByRole('gridcell', { name: 'Equal' })).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: 'test-key' })).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: 'test-value' })).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: 'NoExecute' })).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: '1 seconds(s)' })).toBeTruthy();

  // test bare minimum fields
  await page.getByTestId('add-toleration-button').click();
  await page.getByTestId('toleration-key-input').click();
  await page.getByTestId('toleration-key-input').fill('new-key');
  await page.getByTestId('modal-submit-button').click();
  await expect(page.getByRole('gridcell', { name: 'Exists' })).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: 'new-key' })).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: '-', exact: true }).first()).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: '-', exact: true }).nth(1)).toBeTruthy();
  await expect(page.getByRole('gridcell', { name: '-', exact: true }).nth(2)).toBeTruthy();

  // test edit toleration
  await page
    .getByRole('row', { name: 'Equal new-key - - - Kebab toggle' })
    .getByLabel('Kebab toggle')
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByTestId('toleration-key-input').click();
  await page.getByTestId('toleration-key-input').fill('new-key-update');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('gridcell', { name: 'new-key' })).toHaveCount(1);
  await page
    .getByRole('row', { name: 'Equal new-key - - - Kebab toggle' })
    .getByLabel('Kebab toggle')
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByTestId('toleration-key-input').click();
  await page.getByTestId('toleration-key-input').fill('updated-key');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('gridcell', { name: 'updated-key' })).toHaveCount(1);

  // test cancel clears fields
  await page
    .getByRole('row', { name: 'Equal test-key test-value NoExecute 1 seconds(s) Kebab toggle' })
    .getByLabel('Kebab toggle')
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByTestId('add-toleration-button').click();
  await expect(page.getByTestId('modal-submit-button')).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();

  // test delete
  await page
    .getByRole('row', { name: 'Equal test-key test-value NoExecute 1 seconds(s) Kebab toggle' })
    .getByLabel('Kebab toggle')
    .click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByLabel('Kebab toggle').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'No tolerations' })).toHaveCount(1);
});

test('Edit page has expected values', async ({ page }) => {
  await page.goto(
    navigateToStory(
      'pages-acceleratorprofiles-manageacceleratorprofile',
      'edit-accelerator-profile',
    ),
  );

  // wait for page to load
  await page.waitForSelector('text=Details');

  // test values
  expect(await page.getByTestId('accelerator-name-input').inputValue()).toBe('Test Accelerator');
  expect(await page.getByTestId('accelerator-identifier-input').inputValue()).toBe(
    'nvidia.com/gpu',
  );
  expect(await page.getByTestId('accelerator-description-input').inputValue()).toBe(
    'Test description',
  );
  await expect(page.getByRole('gridcell', { name: 'Exists' })).toHaveCount(1);
  await expect(page.getByRole('gridcell', { name: 'nvidia.com/gpu' })).toHaveCount(1);
  await expect(page.getByRole('gridcell', { name: '-' }).first()).toHaveCount(1);
  await expect(page.getByRole('gridcell', { name: 'NoSchedule' })).toHaveCount(1);
  await expect(page.getByRole('gridcell', { name: '-' }).nth(1)).toHaveCount(1);
});

test('Invalid id in edit page', async ({ page }) => {
  await page.goto(
    navigateToStory(
      'pages-acceleratorprofiles-manageacceleratorprofile',
      'invalid-accelerator-profile',
    ),
  );

  // test for error message
  await expect(
    page.getByText('acceleratorprofiles.dashboard.opendatahub.io "test-accelerator" not found'),
  ).toHaveCount(1);
});

test('One preset identifier is auto filled and disabled', async ({ page }) => {
  await page.goto(
    navigateToStory(
      'pages-acceleratorprofiles-manageacceleratorprofile',
      'create-accelerator-with-one-set-identifier',
    ),
  );

  expect(await page.getByTestId('accelerator-identifier-input').inputValue()).toBe(
    'test-identifier',
  );

  await expect(page.getByTestId('accelerator-identifier-input')).toBeDisabled();
});

test('Multiple preset identifiers show dropdown', async ({ page }) => {
  await page.goto(
    navigateToStory(
      'pages-acceleratorprofiles-manageacceleratorprofile',
      'create-accelerator-with-multiple-set-identifiers',
    ),
  );

  await page.getByRole('button', { name: 'Select an identifier' }).click();
  await expect(page.getByRole('option', { name: 'test-identifier-3' })).toHaveCount(1);
});

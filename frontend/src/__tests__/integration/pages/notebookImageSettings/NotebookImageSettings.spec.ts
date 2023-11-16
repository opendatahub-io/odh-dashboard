import { test, expect } from '@playwright/test';

test('Table filtering, sorting, searching', async ({ page }) => {
  await page.goto(
    '/iframe.html?args=&id=tests-integration-pages-notebookimagesettings-notebookimagesettings--large-list&viewMode=story',
  );

  // test sorting
  // by name
  await page.getByRole('button', { name: 'Name' }).click();
  expect(page.getByText('image-999'));

  // by description
  await page.getByRole('button', { name: 'Description' }).click();
  expect(page.getByText('image-0'));

  // by provider
  await page.getByRole('button', { name: 'Provider' }).click();
  expect(page.getByText('image-0'));

  // by accelerator
  await page.getByRole('button', { name: 'Recommended accelerators' }).click();
  expect(page.getByText('test-accelerator')).toHaveCount(0);
  await page.getByRole('button', { name: 'Recommended accelerators' }).click();
  expect(page.getByText('test-accelerator'));

  // by enabled
  await page.getByRole('button', { name: 'Enable', exact: true }).click();
  expect(page.getByText('image-14'));
  await page.getByRole('button', { name: 'Name' }).click();

  // test pagination
  // test next page
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('button', { name: 'Go to next page' })
    .click();
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('button', { name: 'Go to next page' })
    .click();
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('button', { name: 'Go to next page' })
    .click();
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('button', { name: 'Go to next page' })
    .click();
  expect(page.getByText('image-136'));

  // test type page
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('spinbutton', { name: 'Current page' })
    .click();
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('spinbutton', { name: 'Current page' })
    .fill('50');
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('spinbutton', { name: 'Current page' })
    .press('Enter');
  expect(page.getByText('image-542'));

  // test last and first page
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('button', { name: 'Go to last page' })
    .click();
  expect(page.getByText('image-999'));
  await page
    .locator('#table-pagination-top-pagination')
    .getByRole('button', { name: 'Go to first page' })
    .click();
  expect(page.getByText('image-0'));

  // test filtering
  // by name
  await page.getByPlaceholder('Find by name').click();
  await page.getByPlaceholder('Find by name').fill('123');
  expect(page.getByText('image-123'));

  // by provider
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Options menu' }).click();
  await page.getByRole('option', { name: 'Provider' }).click();
  await page.getByPlaceholder('Find by provider').click();
  await page.getByPlaceholder('Find by provider').fill('provider-321');
  expect(page.getByText('image-321'));

  // by description
  // test switching filtering options
  await page.getByRole('button', { name: 'Options menu' }).click();
  await page.getByRole('option', { name: 'Description' }).click();
  expect(page.getByRole('heading', { name: 'No results found' }));
  await page.getByRole('button', { name: 'Options menu' }).click();
  await page.getByRole('option', { name: 'Provider' }).click();
  expect(page.getByText('image-321'));
});

test('Import form fields', async ({ page }) => {
  await page.goto(
    '/iframe.html?args=&id=tests-integration-pages-notebookimagesettings-notebookimagesettings--default&viewMode=story',
  );

  // test form is disabled initially
  await page.getByRole('button', { name: 'Import new image' }).click();
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();

  // test form is enabled after filling out required fields
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();

  await page.getByLabel('Image location *').click();
  await page.getByLabel('Image location *').fill('image:latest');
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();

  await page.getByLabel('Name *').click();
  await page.getByLabel('Name *').fill('image');
  await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled();

  // test accelerator select field
  // select accelerator from api call
  await page.getByPlaceholder('Example, nvidia.com/gpu').click();
  await page.getByRole('option', { name: 'nvidia.com/gpu' }).click();

  // create new and select
  await page.getByPlaceholder('Example, nvidia.com/gpu').click();
  await page.getByPlaceholder('Example, nvidia.com/gpu').fill('test.com/gpu');
  await page.getByRole('option', { name: 'Create "test.com/gpu"' }).click();
  await page.getByRole('button', { name: 'Options menu' }).click();
  expect(page.getByText('test.com/gpu'));

  // remove custom
  await page.getByRole('button', { name: 'Remove test.com/gpu' }).click();
  await page.getByRole('button', { name: 'Options menu' }).click();
  await expect(page.getByText('test.com/gpu')).toHaveCount(0);

  // reselect custom
  await page
    .getByRole('dialog', { name: 'Import notebook image' })
    .getByRole('button', { name: 'Options menu' })
    .click();
  await page.getByRole('option', { name: 'test.com/gpu' }).click();

  // test form is disabled after entering software add form
  await page.getByTestId('add-software-button').click();
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();

  // test form is enabled after submitting software
  await page.getByRole('textbox', { name: 'Software name input' }).fill('software');
  await page.getByRole('textbox', { name: 'Software version input' }).click();
  await page.getByRole('textbox', { name: 'Software version input' }).fill('version');
  await page.getByRole('button', { name: 'Save displayed content' }).click();
  await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled();
  await expect(page.getByRole('gridcell', { name: 'software' })).toBeAttached();
  await expect(page.getByRole('gridcell', { name: 'version' })).toBeAttached();

  // test adding another software using Tab and Enter
  await page.getByRole('button', { name: 'Add software' }).click();
  await page.getByRole('textbox', { name: 'Software name input' }).fill('software-1');
  await page.getByRole('textbox', { name: 'Software name input' }).press('Tab');
  await page.getByRole('textbox', { name: 'Software version input' }).fill('version-1');
  await page.getByRole('textbox', { name: 'Software version input' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();
  await expect(page.getByRole('gridcell', { name: 'software-1' })).toBeAttached();
  await expect(page.getByRole('gridcell', { name: 'version-1' })).toBeAttached();

  // test escaping from the form doesnt add the software
  await page.getByRole('textbox', { name: 'Software name input' }).fill('software-2');
  await page.getByRole('textbox', { name: 'Software name input' }).press('Escape');
  await expect(page.getByRole('gridcell', { name: 'software-2' })).not.toBeAttached();
  await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled();

  // test deleting software
  await page
    .getByRole('row', {
      name: 'software-1 version-1 Edit displayed content Remove displayed content',
    })
    .getByRole('button', { name: 'Remove displayed content' })
    .click();
  await expect(page.getByRole('gridcell', { name: 'software-1' })).not.toBeAttached();

  // test packages tab
  await page.getByRole('tab', { name: 'Displayed content packages tab' }).click();

  // test adding packages
  // test form is disabled after entering packages add form
  await page.getByTestId('add-packages-button').click();
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();

  // test form is enabled after submitting packages
  await page.getByRole('textbox', { name: 'Packages name input' }).fill('packages');
  await page.getByRole('textbox', { name: 'Packages version input' }).click();
  await page.getByRole('textbox', { name: 'Packages version input' }).fill('version');
  await page.getByRole('button', { name: 'Save displayed content' }).click();
  await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled();
  await expect(page.getByRole('gridcell', { name: 'packages' })).toBeAttached();
  await expect(page.getByRole('gridcell', { name: 'version' })).toBeAttached();

  // test adding another packages using Tab and Enter
  await page.getByRole('button', { name: 'Add packages' }).click();
  await page.getByRole('textbox', { name: 'Packages name input' }).fill('packages-1');
  await page.getByRole('textbox', { name: 'Packages name input' }).press('Tab');
  await page.getByRole('textbox', { name: 'Packages version input' }).fill('version-1');
  await page.getByRole('textbox', { name: 'Packages version input' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();
  await expect(page.getByRole('gridcell', { name: 'packages-1' })).toBeAttached();
  await expect(page.getByRole('gridcell', { name: 'version-1' })).toBeAttached();

  // test escaping from the form doesnt add the packages
  await page.getByRole('textbox', { name: 'Packages name input' }).fill('packages-2');
  await page.getByRole('textbox', { name: 'Packages name input' }).press('Escape');
  await expect(page.getByRole('gridcell', { name: 'packages-2' })).not.toBeAttached();
  await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled();

  // test open packages form blocks cancel, import, close, and tabbing
  await page.getByRole('button', { name: 'Add packages' }).click();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();
});

test('Edit form fields match', async ({ page }) => {
  await page.goto(
    '/iframe.html?args=&id=tests-integration-pages-notebookimagesettings-notebookimagesettings--default&viewMode=story',
  );

  // open edit form
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  // test inputs have correct values
  expect(await page.getByLabel('Image Location *').inputValue()).toBe('test-image:latest');
  expect(await page.getByLabel('Name *').inputValue()).toBe('Testing Custom Image');
  expect(await page.getByLabel('Description').inputValue()).toBe('A custom notebook image');
  expect(page.getByText('nvidia.com/gpu'));
  // test software and packages have correct values
  expect(page.getByRole('gridcell', { name: 'test-software' }));
  expect(page.getByRole('gridcell', { name: '2.0' }));
  await page.getByRole('tab', { name: 'Displayed content packages tab' }).click();
  expect(page.getByRole('gridcell', { name: 'test-package' }));
  expect(page.getByRole('gridcell', { name: '1.0' }));
});

test('Delete form', async ({ page }) => {
  await page.goto(
    '/iframe.html?args=&id=tests-integration-pages-notebookimagesettings-notebookimagesettings--default&viewMode=story',
  );
  // test delete form is disabled initially
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('button', { name: 'Delete notebook image' })).toBeDisabled();

  // test delete form is enabled after filling out required fields
  await page.getByRole('textbox', { name: 'Delete modal input' }).click();
  await page.getByRole('textbox', { name: 'Delete modal input' }).fill('Testing Custom Image');
  await expect(page.getByRole('button', { name: 'Delete notebook image' })).toBeEnabled();
});

test('Error messages', async ({ page }) => {
  await page.goto(
    '/iframe.html?args=&id=tests-integration-pages-notebookimagesettings-notebookimagesettings--image-error&viewMode=story',
  );

  // import error
  await page.getByRole('button', { name: 'Import new image' }).click();
  await page.getByLabel('Image location *').click();
  await page.getByLabel('Image location *').fill('image:location');
  await page.getByLabel('Name *').click();
  await page.getByLabel('Name *').fill('test name');
  await page.getByRole('button', { name: 'Import' }).click();
  expect(page.getByText('Testing create error message'));
  await page.getByRole('button', { name: 'Close' }).click();

  // edit error
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Update' }).click();
  expect(page.getByText('Testing edit error message'));
  await page.getByRole('button', { name: 'Close' }).click();

  // delete error
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('textbox', { name: 'Delete modal input' }).click();
  await page.getByRole('textbox', { name: 'Delete modal input' }).fill('Testing Custom Image');
  await page.getByRole('button', { name: 'Delete notebook image' }).click();
  expect(page.getByRole('heading', { name: 'Danger alert: Error deleting Testing Custom Image' }));
  await page.getByRole('button', { name: 'Close' }).click();

  // test error icon
  expect(page.getByRole('button', { name: 'error icon' }));
});

test('Import modal opens from the empty state', async ({ page }) => {
  await page.goto(
    '/iframe.html?args=&id=tests-integration-pages-notebookimagesettings-notebookimagesettings--empty&viewMode=story',
  );
  await page.getByRole('button', { name: 'Import new image' }).click();
  expect(page.getByText('Import notebook image'));
});

import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

// test('Deploy ModelMesh model', async ({ page }) => {
//   await page.goto(
//     navigateToStory('pages-modelserving-servingruntimelist', 'model-mesh-list-available-models'),
//   );

//   // wait for page to load
//   await page.waitForSelector('text=Deploy model');

//   await page
//     .getByRole('rowgroup')
//     .filter({ has: page.getByRole('button', { name: 'ovms', exact: true }) })
//     .getByText('Deploy model')
//     .click();

//   // test that you can not submit on empty
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();

//   // test filling in minimum required fields
//   await page.getByLabel('Model Name *').fill('Test Name');
//   await page.locator('#inference-service-framework-selection').click();
//   await page.getByRole('option', { name: 'onnx - 1' }).click();
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
//   await page
//     .getByRole('group', { name: 'Model location' })
//     .getByRole('button', { name: 'Options menu' })
//     .click();
//   await page.getByRole('option', { name: 'Test Secret' }).click();
//   await page.getByLabel('Path').fill('test-model/');
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
//   await page.getByText('New data connection').click();
//   await page.getByLabel('Path').fill('');
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
//   await page.getByRole('textbox', { name: 'Field list Name' }).fill('Test Name');
//   await page.getByRole('textbox', { name: 'Field list AWS_ACCESS_KEY_ID' }).fill('test-key');
//   await page
//     .getByRole('textbox', { name: 'Field list AWS_SECRET_ACCESS_KEY' })
//     .fill('test-secret-key');
//   await page.getByRole('textbox', { name: 'Field list AWS_S3_ENDPOINT' }).fill('test-endpoint');
//   await page.getByRole('textbox', { name: 'Field list AWS_S3_BUCKET' }).fill('test-bucket');
//   await page.getByLabel('Path').fill('test-model/');
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
// });

// test('Deploy KServe model', async ({ page }) => {
//   await page.goto(
//     navigateToStory(
//       'pages-modelserving-servingruntimelist',
//       'both-platform-enabled-and-project-not-labelled',
//     ),
//   );
//
//   // wait for page to load
//   await page.waitForSelector('text=Deploy model');
//
//   await page.getByRole('button', { name: 'Deploy model', exact: true }).click();
//
//   // test that you can not submit on empty
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
//
//   // test popovers
//   const expectedContent = [
//     {
//       ariaLabel: 'Model server replicas info',
//       content:
//         'Consider network traffic and failover scenarios when specifying the number of model server replicas.',
//     },
//     {
//       ariaLabel: 'Model server size info',
//       content:
//         'Select a server size that will accommodate your largest model. See the product documentation for more information.',
//     },
//   ];
//
//   for (const item of expectedContent) {
//     const iconPopover = await page.getByRole('button', { name: item.ariaLabel, exact: true });
//     if (await iconPopover.isVisible()) {
//       await iconPopover.click();
//       await expect(page.getByText(item.content)).toBeTruthy();
//     }
//   }
//
//   // test filling in minimum required fields
//   await page.getByLabel('Model Name *').fill('Test Name');
//   await page.locator('#serving-runtime-template-selection').click();
//   await page.getByRole('menuitem', { name: 'Caikit' }).click();
//   await expect(page.getByRole('menuitem', { name: 'New OVMS Server Invalid' })).toBeHidden();
//   await page.locator('#inference-service-framework-selection').click();
//   await page.getByRole('option', { name: 'onnx - 1' }).click();
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
//   await page
//     .getByRole('group', { name: 'Model location' })
//     .getByRole('button', { name: 'Options menu' })
//     .click();
//   await page.getByRole('option', { name: 'Test Secret' }).click();
//   await page.getByLabel('Path').fill('test-model/');
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
//   await page.getByText('New data connection').click();
//   await page.getByLabel('Path').fill('');
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeDisabled();
//   await page.getByRole('textbox', { name: 'Field list Name' }).fill('Test Name');
//   await page.getByRole('textbox', { name: 'Field list AWS_ACCESS_KEY_ID' }).fill('test-key');
//   await page
//     .getByRole('textbox', { name: 'Field list AWS_SECRET_ACCESS_KEY' })
//     .fill('test-secret-key');
//   await page.getByRole('textbox', { name: 'Field list AWS_S3_ENDPOINT' }).fill('test-endpoint');
//   await page.getByRole('textbox', { name: 'Field list AWS_S3_BUCKET' }).fill('test-bucket');
//   await page.getByLabel('Path').fill('test-model/');
//   await expect(await page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled();
// });

test('No model serving platform available', async ({ page }) => {
  await page.goto(
    navigateToStory(
      'pages-modelserving-servingruntimelist',
      'neither-platform-enabled-and-project-not-labelled',
    ),
  );

  expect(page.getByText('No model serving platform selected')).toBeTruthy();
});

test('ModelMesh ServingRuntime list', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-servingruntimelist', 'model-mesh-list-available-models'),
  );

  // wait for page to load
  await page.waitForSelector('text=Add model server');

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

  // // Get the first and second row
  // const firstButton = page.getByRole('button', { name: 'ovms', exact: true });
  // const secondButton = page.getByRole('button', { name: 'OVMS Model Serving', exact: true });
  // const firstRow = page.getByRole('rowgroup').filter({ has: firstButton });
  // const secondRow = page.getByRole('rowgroup').filter({ has: secondButton });

  // // Check that both of the rows are not expanded
  // await expect(firstRow).not.toHaveClass(/pf-m-expanded/);
  // await expect(secondRow).not.toHaveClass(/pf-m-expanded/);

  // await firstButton.click();

  // // Check that the first row is expanded while the second is not
  // await expect(firstRow).toHaveClass(/pf-m-expanded/);
  // await expect(secondRow).not.toHaveClass(/pf-m-expanded/);
});

test('KServe Model list', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-servingruntimelist', 'kserve-list-available-models'),
  );

  // wait for page to load
  await page.waitForSelector('text=Deploy model');

  // Check that we get the correct model name
  await expect(page.getByText('Test Inference Service')).toBeAttached();

  // Check that the serving runtime displays the correct Serving Runtime
  await expect(page.getByText('OpenVINO Serving Runtime (Supports GPUs)').first()).toBeAttached();

  // Check for resource marked for deletion
  await expect(page.getByText('Another Inference Service')).toBeAttached();

  await expect(
    page.getByRole('button', { name: 'This resource is marked for deletion.' }),
  ).toBeAttached();
});

test('Add ModelMesh model server', async ({ page }) => {
  await page.goto(
    navigateToStory('pages-modelserving-servingruntimelist', 'model-mesh-list-available-model'),
  );

  // wait for page to load
  await page.waitForSelector('text=Add model server');

  await page.getByRole('button', { name: 'Add model server', exact: true }).click();

  // test that you can not submit on empty
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();

  // test filling in minimum required fields
  await page.getByLabel('Model server name *').fill('Test Name');
  await page.locator('#serving-runtime-template-selection').click();
  await page.getByRole('menuitem', { name: 'New OVMS Server' }).click();
  await expect(page.getByRole('menuitem', { name: 'New OVMS Server Invalid' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();

  //test Add model server tooltips
  const expectedContent = [
    {
      ariaLabel: 'Model server replicas info',
      content:
        'Consider network traffic and failover scenarios when specifying the number of model server replicas.',
    },
    {
      ariaLabel: 'Model server size info',
      content:
        'Select a server size that will accommodate your largest model. See the product documentation for more information.',
    },
    {
      ariaLabel: 'Accelerator info',
      content:
        'Ensure that appropriate tolerations are in place before adding an accelerator to your model server.',
    },
  ];

  for await (const item of expectedContent) {
    const iconPopover = await page.getByRole('button', { name: item.ariaLabel, exact: true });
    if (await iconPopover.isVisible()) {
      await iconPopover.click();
      const popoverContent = await page.locator('div.pf-v5-c-popover__content').textContent();
      expect(popoverContent).toContain(item.content);

      const closeButton = await page.locator('div.pf-v5-c-popover__close');
      await closeButton.click();
    }
    await page.waitForTimeout(300);
  }
  // test the if the alert is visible when route is external while token is not set
  await expect(page.locator('#alt-form-checkbox-route')).not.toBeChecked();
  await expect(page.locator('#alt-form-checkbox-auth')).not.toBeChecked();
  await expect(page.locator('#external-route-no-token-alert')).toBeHidden();
  // check external route, token should be checked and no alert
  await page.locator('#alt-form-checkbox-route').check();
  await expect(page.locator('#alt-form-checkbox-auth')).toBeChecked();
  await expect(page.locator('#external-route-no-token-alert')).toBeHidden();
  await expect(page.locator('#service-account-form-name')).toBeVisible();
  await expect(page.locator('#service-account-form-name')).toHaveValue('default-name');
  // check external route, uncheck token, show alert
  await page.locator('#alt-form-checkbox-auth').uncheck();
  await expect(page.locator('#external-route-no-token-alert')).toBeVisible();
  // internal route, set token, no alert
  await page.locator('#alt-form-checkbox-route').uncheck();
  await page.locator('#alt-form-checkbox-auth').check();
  await expect(page.locator('#external-route-no-token-alert')).toBeHidden();
});

// test('Edit ModelMesh model server', async ({ page }) => {
//   await page.goto(
//     navigateToStory('pages-modelserving-servingruntimelist', 'model-mesh-list-available-model'),
//   );

//   // wait for page to load
//   await page.waitForSelector('text=Add model server');

//   // click on the toggle button and open edit model server
//   await page
//     .getByRole('rowgroup')
//     .filter({ has: page.getByRole('button', { name: 'ovms', exact: true }) })
//     .getByLabel('Kebab toggle')
//     .click();
//   await page.getByText('Edit model server').click();

//   const updateButton = page.getByRole('button', { name: 'Update', exact: true });

//   // test name field
//   await expect(updateButton).toBeDisabled();
//   await page.locator('#serving-runtime-name-input').fill('New name');
//   await expect(updateButton).toBeEnabled();
//   await page.locator('#serving-runtime-name-input').fill('test-model-legacy');
//   await expect(updateButton).toBeDisabled();

//   // test replicas field
//   await page.getByRole('button', { name: 'Plus', exact: true }).click();
//   await expect(updateButton).toBeEnabled();
//   await page.getByRole('button', { name: 'Minus', exact: true }).click();
//   await expect(updateButton).toBeDisabled();

//   // test size field
//   await page
//     .getByRole('group', { name: 'Compute resources per replica' })
//     .getByRole('button', { name: 'Options menu' })
//     .click();
//   await page.getByRole('option', { name: 'Medium' }).click();
//   await expect(updateButton).toBeEnabled();
//   await page
//     .getByRole('group', { name: 'Compute resources per replica' })
//     .getByRole('button', { name: 'Options menu' })
//     .click();
//   await page.getByRole('option', { name: 'Small' }).click();
//   await expect(updateButton).toBeDisabled();

//   // test external route field
//   await page.locator('#alt-form-checkbox-route').check();
//   await expect(updateButton).toBeEnabled();
//   await page.locator('#alt-form-checkbox-route').uncheck();
//   await page.locator('#alt-form-checkbox-auth').uncheck();
//   await expect(updateButton).toBeDisabled();

//   // test tokens field
//   await page.locator('#alt-form-checkbox-auth').check();
//   await expect(updateButton).toBeEnabled();
//   await page.locator('#alt-form-checkbox-auth').uncheck();
//   await expect(updateButton).toBeDisabled();
// });

import { test } from '@playwright/test';
// import { PVC_SIZE_HINT } from '~/pages/clusterSettings/const';

test('Cluster settings', async () => {
  // await page.goto(
  //   './iframe.html?args=&id=tests-integration-pages-clustersettings-clustersettings--default&viewMode=story',
  // );
  // // wait for page to load
  // await page.waitForSelector('text=Save changes');
  // const submitButton = page.locator('[data-id="submit-cluster-settings"]');
  // // check PVC size field
  // const pvcInputField = page.locator('[data-id="pvc-size-input"]');
  // const pvcHint = page.getByText(PVC_SIZE_HINT).locator('.pf-c-helper-text__item');
  // pvcInputField.clear();
  // await pvcInputField.type('10', { delay: 50 });
  // expect(submitButton).toBeEnabled();
  // pvcInputField.clear();
  // expect(submitButton).toBeDisabled();
  // expect(pvcHint).toHaveClass('pf-m-error');
  // await page.locator('[data-id="restore-default-button"').click();
  // expect(pvcHint).toHaveClass('pf-m-indeterminate');
  // // check culler field
  // const cullerHint = canvas.getByText(CULLER_TIMEOUT_HINT).closest('.pf-c-helper-text__item');
  // userEvent.click(canvas.getByTestId('culler-timeout-limited'));
  // expect(submitButton).toBeEnabled();
  // userEvent.clear(canvas.getByTestId('hour-input'));
  // expect(submitButton).toBeDisabled();
  // expect(cullerHint).toHaveClass('pf-m-error');
  // await userEvent.type(canvas.getByTestId('minute-input'), '20', { delay: 50 });
  // expect(submitButton).toBeEnabled();
  // expect(cullerHint).toHaveClass('pf-m-indeterminate');
  // userEvent.click(canvas.getByTestId('culler-timeout-unlimited'));
  // expect(submitButton).toBeDisabled();
  // // check user tracking field
  // const telemetryCheckbox = canvas.getByTestId('usage-data-checkbox');
  // userEvent.click(telemetryCheckbox);
  // expect(submitButton).toBeEnabled();
  // userEvent.click(telemetryCheckbox);
  // expect(submitButton).toBeDisabled();
  // // check notebook toleration field
  // const tolerationKeyInput = canvas.getByTestId('toleration-key-input');
  // expect(canvas.queryByText(TOLERATION_FORMAT_ERROR)).toBeNull();
  // userEvent.clear(tolerationKeyInput);
  // expect(canvas.getByText(TOLERATION_FORMAT_ERROR)).toBeInTheDocument();
  // expect(submitButton).toBeDisabled();
  // await userEvent.type(tolerationKeyInput, 'NotebooksOnlyChange', { delay: 50 });
  // expect(canvas.queryByText(TOLERATION_FORMAT_ERROR)).toBeNull();
  // userEvent.click(canvas.getByTestId('tolerations-enabled-checkbox'));
  // expect(submitButton).toBeEnabled();
});

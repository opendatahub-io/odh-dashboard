import { test, expect } from '@playwright/test';

test('Success', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usefetchstate--success&viewMode=story',
  );

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect(await page.getByTestId('result-value-1').innerText()).toBe('true');

  // test that value is correct
  expect(await page.getByTestId('result-value-0').innerText()).toBe('"success-test-state"');
});

test('Failure', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usefetchstate--failure&viewMode=story',
  );

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect(await page.getByTestId('result-value-1').innerText()).toBe('false');

  // test that value is correct
  expect(await page.getByTestId('result-value-0').innerText()).toBe('"default-test-state"');

  // test that error is correct
  expect(await page.getByTestId('result-value-2').innerText()).toBe('"error-test-state"');
});

test('Stable', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usefetchstate--stable&viewMode=story',
  );

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect(await page.getByTestId('result-value-1').innerText()).toBe('true');

  // test that result is unstable and func is stable
  // the result will always be unstable as it comes from a promise
  expect(await page.getByTestId('result-status-0').innerText()).toBe('unstable');
  expect(await page.getByTestId('result-status-3').innerText()).toBe('stable');

  // switch to params-0
  await page.getByTestId('params-0').click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(await page.getByTestId('result-status-0').innerText()).toBe('unstable');
  expect(await page.getByTestId('result-status-3').innerText()).toBe('stable');

  // switch to params-1
  await page.getByTestId('params-1').click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(await page.getByTestId('result-status-0').innerText()).toBe('unstable');
  expect(await page.getByTestId('result-status-3').innerText()).toBe('stable');

  // switch to params-2 (object)
  await page.getByTestId('params-2').click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(await page.getByTestId('result-status-0').innerText()).toBe('unstable');
  expect(await page.getByTestId('result-status-3').innerText()).toBe('stable');

  // switch to params-3 (error)
  await page.getByTestId('params-3').click();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(await page.getByTestId('result-status-0').innerText()).toBe('stable');
  expect(await page.getByTestId('result-value-2').innerText()).toBe('"error-test-state"');
  expect(await page.getByTestId('result-value-1').innerText()).toBe('true');
});

test('Refresh rate', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usefetchstate--refresh-rate&viewMode=story',
  );

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect(await page.getByTestId('result-value-1').innerText()).toBe('true');

  // test that result is unstable and func is stable
  // the result will always be unstable as it comes from a promise
  expect(await page.getByTestId('result-status-0').innerText()).toBe('unstable');
  expect(await page.getByTestId('result-status-3').innerText()).toBe('stable');

  // switch to params-0
  await page.getByTestId('params-0').click();
  expect(await page.getByTestId('result-status-0').innerText()).toBe('unstable');
  expect(await page.getByTestId('result-status-3').innerText()).toBe('stable');
});

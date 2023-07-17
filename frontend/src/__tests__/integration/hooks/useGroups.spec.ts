import { test, expect } from '@playwright/test';

test('success', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usegroups--success&viewMode=story',
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(await page.getByTestId('result-value-0').innerText()).toBe(
    '[{"name":"item1","kind":"Group"},{"name":"item2","kind":"Group"}]',
  );
  expect(await page.getByTestId('result-value-1').innerText()).toBe('true');
  expect(await page.getByTestId('result-type-2').innerText()).toBe('undefined');
});

test('Error403', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usegroups--error-403&viewMode=story',
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(await page.getByTestId('result-value-0').innerText()).toBe('[]');
  expect(await page.getByTestId('result-value-1').innerText()).toBe('true');
  expect(await page.getByTestId('result-type-2').innerText()).toBe('undefined');
});

test('Error404', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usegroups--error-404&viewMode=story',
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(await page.getByTestId('result-value-0').innerText()).toBe('[]');
  expect(await page.getByTestId('result-value-1').innerText()).toBe('false');
  expect(await page.getByTestId('result-value-2').innerText()).toBe('Error: No groups found.');
});

test('Error500', async ({ page }) => {
  await page.goto(
    './iframe.html?args=&id=tests-integration-hooks-usegroups--error-500&viewMode=story',
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(await page.getByTestId('result-value-0').innerText()).toBe('[]');
  expect(await page.getByTestId('result-value-1').innerText()).toBe('false');
});

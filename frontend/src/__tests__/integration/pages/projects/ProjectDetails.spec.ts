import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Empty project', async ({ page }) => {
  await page.goto(navigateToStory('pages-projects-projectdetails', 'empty-details-page'));

  // wait for page to load
  await page.waitForSelector('text=No model servers');

  // the dividers number should always 1 less than the section number
  const sections = await page.locator('[data-id="details-page-section"]').all();
  const dividers = await page.locator('[data-id="details-page-section-divider"]').all();

  expect(dividers).toHaveLength(sections.length - 1);
});

test('Non-empty project', async ({ page }) => {
  await page.goto(navigateToStory('pages-projects-projectdetails', 'default'));

  // wait for page to load
  await page.waitForSelector('text=Test Notebook');

  // we fill in the page with data, so there should be no dividers on the page
  expect(await page.locator('[data-id="details-page-section-divider"]').all()).toHaveLength(0);

  // check the x-small size shown correctly
  expect(page.getByText('Small')).toBeTruthy();
});

test('Notebook with deleted image', async ({ page }) => {
  await page.goto(navigateToStory('pages-projects-projectdetails', 'deleted-image'));

  // wait for page to load
  await page.waitForSelector('text=Test Notebook');

  await expect(page.getByText('Deleted')).toHaveCount(1);
  await expect(page.getByText('Test Image')).toHaveCount(1);
});

test('Notebook with disabled image', async ({ page }) => {
  await page.goto(navigateToStory('pages-projects-projectdetails', 'disabled-image'));

  // wait for page to load
  await page.waitForSelector('text=Test Notebook');

  await expect(page.getByText('Disabled', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Test Image')).toHaveCount(1);
});

test('Notebook with unknown image', async ({ page }) => {
  await page.goto(navigateToStory('pages-projects-projectdetails', 'unknown-image'));

  // wait for page to load
  await page.waitForSelector('text=Test Notebook');

  await expect(page.getByText('Deleted')).toHaveCount(1);
  await expect(page.getByText('Unknown', { exact: true })).toHaveCount(1);
});

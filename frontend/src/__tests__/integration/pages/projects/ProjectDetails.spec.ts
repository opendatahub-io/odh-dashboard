import { test, expect } from '@playwright/test';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Empty project', async ({ page }) => {
  await page.goto(navigateToStory('pages-projects-projectdetails', 'empty-details-page'));

  // wait for page to load
  await page.waitForSelector('text=Models and model servers');

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
  expect(await page.getByText('XSmall')).toBeTruthy();
});

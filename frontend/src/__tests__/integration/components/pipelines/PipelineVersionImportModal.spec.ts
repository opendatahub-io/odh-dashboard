import { test, expect } from '@playwright/test';
import { mockPipelinesProxy } from '~/__mocks__/mockPipelinesProxy';
import { navigateToStory } from '~/__tests__/integration/utils';

test('Pipeline version import modal - Update pipeline selector should generate meaningful version name', async ({
  page,
}) => {
  await page.goto(navigateToStory('components-pipelines-pipelineversionimportmodal', 'default'));

  await page.locator('#pipeline-selector').click();
  await page.getByText(mockPipelinesProxy.pipelines[0].name).click();
  await expect(await page.locator('#pipeline-version-name').getAttribute('value')).toMatch(
    new RegExp(`${mockPipelinesProxy.pipelines[0].name}_version_at_.*`),
  );

  await page.locator('#pipeline-selector').click();
  await page.getByText(mockPipelinesProxy.pipelines[1].name).click();
  await expect(await page.locator('#pipeline-version-name').getAttribute('value')).toMatch(
    new RegExp(`${mockPipelinesProxy.pipelines[1].name}_version_at_.*`),
  );
});

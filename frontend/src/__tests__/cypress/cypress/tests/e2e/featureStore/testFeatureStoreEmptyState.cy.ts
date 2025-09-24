import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal.ts';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import type { FeatureStoreTestData } from '#~/__tests__/cypress/cypress/types';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';

describe('Feature Store Smoke Tests to verify  Empty state page contents', () => {
  let testData: FeatureStoreTestData;

  retryableBefore(() => {
    cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as FeatureStoreTestData;
      },
    );
  });

  it(
    'Verify Feature Store Default Empty State Contents',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.step('Login to the Application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Feature Store page `);
      featureStoreGlobal.navigate().navigateToOverview();

      testData.feastNavItems.forEach((item: string) => {
        cy.step(`Navigate to ${item}`);
        appChrome.findNavItem(item).click();
        featureStoreGlobal.shouldHaveEmptyStateDescription();
      });
    },
  );
});

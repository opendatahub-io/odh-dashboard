import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal.ts';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

describe('Verify Feature Store Default page Contents', () => {
  it(
    'Verify Left Menu Navigation to Feature Store',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.step(`Navigate to the Feature Store page `);
      featureStoreGlobal.visitFeatureStore();

      const navItems = [
        'Overview',
        'Entities',
        'Features',
        'Feature views',
        'Feature services',
        'Datasets',
        'Data sources',
      ];

      navItems.forEach((item) => {
        cy.step(`Navigate to ${item}`);
        appChrome.findNavItem(item).click();
        cy.contains(
          'A catalog of features, entities, feature views and datasets created by your own team',
        ).should('be.visible');
        cy.contains('Create a Feature store service').should('be.visible');
        cy.contains(
          'No feature store service is available to users in your organization. Create a Feature store service from the OpenShift platform.',
        ).should('be.visible');
      });
    },
  );
});

import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { modelCatalogSettings } from '../../../pages/modelCatalogSettings';
import { pageNotfound } from '../../../pages/pageNotFound';

describe('Verify AI Catalog Settings Access Control', () => {
  it(
    'Admin user can access AI catalog settings',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog'] },
    () => {
      cy.step('Log into the application as admin with aiCatalogSettings flag enabled');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI catalog settings');
      modelCatalogSettings.navigate();

      cy.step('Verify add source button is visible');
      modelCatalogSettings.findAddSourceButton().should('be.visible');
    },
  );

  it(
    'Non-admin user cannot access AI catalog settings',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog'] },
    () => {
      cy.step('Log into the application as non-admin user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Verify AI catalog settings nav item is not visible for non-admin');
      modelCatalogSettings.findNavItem().should('not.exist');

      cy.step('Attempt to navigate to AI catalog settings directly');
      cy.visit('/settings/model-resources-operations/model-catalog', { failOnStatusCode: false });

      cy.step('Verify page not found is displayed');
      pageNotfound.findPage().should('exist');
    },
  );
});

import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { modelCatalogSettings } from '../../../pages/modelCatalogSettings';
import { pageNotfound } from '../../../pages/pageNotFound';

describe('Verify AI Catalog Sources Access Control', () => {
  it(
    'Admin user can access AI catalog sources',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog'] },
    () => {
      cy.step('Log into the application as admin with aiCatalogSettings flag enabled');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI catalog sources');
      modelCatalogSettings.navigate();

      cy.step('Verify add source button is visible');
      modelCatalogSettings.findAddSourceButton().should('be.visible');
    },
  );

  it(
    'Non-admin user cannot access AI catalog sources',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog'] },
    () => {
      cy.step('Log into the application as non-admin user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Verify AI catalog sources nav item is not visible for non-admin');
      modelCatalogSettings.findNavItem().should('not.exist');

      cy.step('Attempt to navigate to AI catalog sources directly');
      modelCatalogSettings.visitExpectDenied();

      cy.step('Verify page not found is displayed');
      pageNotfound.findPage().should('exist');
    },
  );
});

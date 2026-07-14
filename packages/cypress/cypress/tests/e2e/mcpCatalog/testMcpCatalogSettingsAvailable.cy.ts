import { LDAP_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { mcpCatalogSettings } from '../../../pages/mcpCatalogSettings';
import { pageNotfound } from '../../../pages/pageNotFound';

describe('Verify MCP Catalog Settings Access Control', () => {
  it(
    'Admin user can access MCP catalog settings',
    { tags: ['@Dashboard', '@McpCatalog', '@Featureflagged'] },
    () => {
      cy.step('Log into the application as admin with mcpCatalog flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=mcpCatalog=true', LDAP_ADMIN_USER);

      cy.step('Navigate to MCP catalog settings');
      mcpCatalogSettings.navigate();

      cy.step('Verify add source button is visible');
      mcpCatalogSettings.findAddSourceButtonTable().should('be.visible');
    },
  );

  it(
    'Non-admin user cannot access MCP catalog settings',
    { tags: ['@Dashboard', '@McpCatalog', '@Featureflagged'] },
    () => {
      cy.step('Log into the application as non-admin user with mcpCatalog flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=mcpCatalog=true', LDAP_CONTRIBUTOR_USER);

      cy.step('Verify MCP catalog settings nav item is not visible for non-admin');
      mcpCatalogSettings.findNavItem().should('not.exist');

      cy.step('Attempt to navigate to MCP catalog settings directly');
      mcpCatalogSettings.visitExpectDenied();

      cy.step('Verify page not found is displayed');
      pageNotfound.findPage().should('exist');
    },
  );
});

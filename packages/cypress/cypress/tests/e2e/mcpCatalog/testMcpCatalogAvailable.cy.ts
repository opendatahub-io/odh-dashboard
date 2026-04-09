import { LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { mcpCatalogPage } from '../../../pages/mcpCatalog';

describe('Verifies that MCP Catalog is accessible to non-admin users', () => {
  it(
    'Verifies that MCP Catalog is available for a non-admin user',
    { tags: ['@Dashboard', '@McpCatalog', '@Featureflagged'] },
    () => {
      cy.step('Login as LDAP user with mcpCatalog feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=mcpCatalog=true', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to MCP Catalog');
      mcpCatalogPage.navigate();

      cy.step('Verify MCP Catalog tab page title is present');
      mcpCatalogPage.findPageTitle().should('exist');

      cy.step('Verify MCP Catalog cards are displayed');
      mcpCatalogPage.findMcpCatalogCards().should('exist');
    },
  );
});

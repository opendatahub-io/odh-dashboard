import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { pageNotfound } from '../../../pages/pageNotFound';
import { navSidebar } from '../navSidebar/navSidebar';

describe('MCP Catalog feature flag', () => {
  it('should show MCP Catalog nav item when feature flag is enabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        mcpCatalog: true,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('exist');
    navSidebar.findNavItem({ name: 'MCP Catalog', rootSection: 'AI hub' }).should('exist');
  });

  it('should not show MCP Catalog nav item when feature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        mcpCatalog: false,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavItem({ name: 'MCP Catalog', rootSection: 'AI hub' }).should('not.exist');
  });

  it('should show 404 page when navigating to MCP Catalog with flag disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        mcpCatalog: false,
      }),
    );
    cy.visitWithLogin('/ai-hub/mcp-catalog');
    pageNotfound.findPage().should('exist');
  });
});

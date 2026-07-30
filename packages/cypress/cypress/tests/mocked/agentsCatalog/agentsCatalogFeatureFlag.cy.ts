import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { pageNotfound } from '../../../pages/pageNotFound';
import { agentsCatalogPage } from '../../../pages/agentsCatalog';
import { navSidebar } from '../navSidebar/navSidebar';

describe('Agents Catalog feature flag', () => {
  it('should show Agents nav item when feature flag is enabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        agentsCatalog: true,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('exist');
    agentsCatalogPage.findNavItem().should('exist');
  });

  it('should not show Agents nav item when feature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        agentsCatalog: false,
      }),
    );
    navSidebar.visit();
    agentsCatalogPage.findNavItem().should('not.exist');
  });

  it('should show Agents nav item when both agentsCatalog and agentOps are enabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        agentsCatalog: true,
        agentOps: true,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('exist');
    agentsCatalogPage.findNavItem().should('exist');
  });

  it('should show Agents nav item when only agentOps is enabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        agentOps: true,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('exist');
    agentsCatalogPage.findNavItem().should('exist');
  });

  it('should show Agents nav item when enabled and Model Registry is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        agentsCatalog: true,
        disableModelRegistry: true,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('exist');
    agentsCatalogPage.findNavItem().should('exist');
  });

  it('should show 404 page when navigating to Agents Catalog with flag disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        agentsCatalog: false,
      }),
    );
    cy.visitWithLogin('/ai-hub/agents/catalog');
    pageNotfound.findPage().should('exist');
  });
});

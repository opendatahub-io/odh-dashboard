import { observability } from '../../pages/observability';
import { portal } from '../../pages/portal';
import { setupObservabilityMocks, usageDashboardsPath } from '../../support/observability';
import { portalPath, setupPortalMocks } from '../../support/portal';

const dashboardRoute = '/observe-and-monitor/dashboard';

describe('Grid portal observability', () => {
  it('shows My Usage and Usage for an admin and preserves the selected tab on reload', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    setupObservabilityMocks({ isMaaSAdmin: true });
    portal.visit();
    portal.findNavLink('Observability dashboard').click();
    cy.wait('@whoami');
    cy.wait('@dashboards');
    observability.findTabs().should('have.length', 2);
    observability.findTab('My Usage').should('have.attr', 'aria-selected', 'true');
    observability.findTab('Usage').click();
    cy.location('pathname').should('eq', portalPath(dashboardRoute));
    cy.location('search').should('include', 'dashboard=dashboard-4-maas-usage-logs-admin');
    cy.reload();
    cy.wait('@dashboards');
    observability.findTabs().should('have.length', 2);
    observability.findTab('Usage').should('have.attr', 'aria-selected', 'true');
  });

  it('shows only My Usage for a regular user', () => {
    setupPortalMocks();
    setupObservabilityMocks();
    portal.visit(dashboardRoute);
    cy.wait('@whoami');
    cy.wait('@dashboards');
    observability.findTabs().should('have.length', 1);
    observability.findTab('My Usage').should('have.attr', 'aria-selected', 'true');
    observability.findTab('Usage').should('not.exist');
    cy.reload();
    cy.wait('@dashboards');
    observability.findTabs().should('have.length', 1);
    observability.findTab('My Usage').should('have.attr', 'aria-selected', 'true');
  });

  it('shows an empty state when no usage dashboards are configured', () => {
    setupPortalMocks();
    setupObservabilityMocks({ dashboards: [] });
    portal.visit(dashboardRoute);
    cy.wait('@dashboards');
    observability.findEmptyState().should('be.visible');
  });

  for (const statusCode of [403, 503]) {
    it(`distinguishes dashboard access denial from service unavailability (${statusCode})`, () => {
      setupPortalMocks();
      setupObservabilityMocks();
      cy.intercept('GET', usageDashboardsPath, {
        statusCode,
        body: { message: 'Usage dashboards request failed' },
      }).as('failedDashboards');
      portal.visit(dashboardRoute);
      cy.wait('@failedDashboards');
      if (statusCode === 403) {
        observability.findAccessDenied().should('be.visible');
      } else {
        observability.findUnavailable().should('be.visible');
      }
      portal.findNavLink('API keys').should('be.visible');
    });
  }
});

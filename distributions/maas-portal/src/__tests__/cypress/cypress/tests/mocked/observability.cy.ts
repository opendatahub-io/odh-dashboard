import { observabilityDashboardPage } from '@odh-dashboard/observability/testing/pages';
import { mockPersesDashboard } from '@odh-dashboard/observability/__mocks__/observabilityFixtures';
import { observability } from '../../pages/observability';
import { portal } from '../../pages/portal';
import { setupObservabilityMocks, persesDashboardsPath } from '../../support/observability';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';

const dashboardRoute = '/observe-and-monitor/dashboard';

describe('Portal observability', () => {
  beforeEach(() => setupPortalMocks());

  it('loads Perses dashboards through the portal and preserves tab selection on reload', () => {
    setupObservabilityMocks({
      dashboards: [
        mockPersesDashboard({
          name: 'dashboard-1-model',
          displayName: 'Model',
          project: 'opendatahub',
        }),
        mockPersesDashboard({
          name: 'dashboard-2-tenancy',
          displayName: 'Tenancy',
          project: 'opendatahub',
        }),
      ],
    });
    portal.visit();
    portal.findNavLink('Observability dashboard').click();
    cy.wait(['@dashboards', '@projects', '@metricsAccess']);
    observabilityDashboardPage.findTab('Model').should('have.attr', 'aria-selected', 'true');
    observabilityDashboardPage
      .findTab('Tenancy')
      .should('have.attr', 'href')
      .and('include', portalPath(dashboardRoute));
    observabilityDashboardPage.findTab('Tenancy').click();
    cy.location('pathname').should('eq', portalPath(dashboardRoute));
    cy.location('search').should('include', 'dashboard=dashboard-2-tenancy');
    cy.reload();
    observabilityDashboardPage.findTab('Tenancy').should('have.attr', 'aria-selected', 'true');
  });

  for (const allowed of [false, true]) {
    it(`shows cluster dashboards only when the metrics access review allows it (${allowed})`, () => {
      // MaaS administration must not grant cluster metrics access implicitly.
      setupPortalMocks({ isMaaSAdmin: true });
      setupObservabilityMocks({
        clusterMetricsAllowed: allowed,
        dashboards: [
          mockPersesDashboard({
            name: 'dashboard-0-cluster-admin',
            displayName: 'Cluster',
            project: 'opendatahub',
          }),
          mockPersesDashboard({
            name: 'dashboard-1-model',
            displayName: 'Model',
            project: 'opendatahub',
          }),
        ],
      });
      portal.visit(dashboardRoute);
      cy.wait('@metricsAccess');
      observabilityDashboardPage.findTab('Model').should('be.visible');
      observabilityDashboardPage.findTab('Cluster').should(allowed ? 'be.visible' : 'not.exist');
    });
  }

  it('shows no projects when only project-scoped dashboards exist and the user has no projects', () => {
    setupObservabilityMocks({
      dashboards: [
        mockPersesDashboard({
          name: 'dashboard-1-model',
          displayName: 'Model',
          project: 'opendatahub',
          projectScoped: true,
        }),
      ],
      projects: [],
    });
    portal.visit(dashboardRoute);
    observability.findNoProjects().should('be.visible');
    observabilityDashboardPage.findTabs().should('not.exist');
  });

  for (const statusCode of [403, 503]) {
    it(`distinguishes Perses access denial from service unavailability (${statusCode})`, () => {
      setupObservabilityMocks();
      cy.intercept('GET', persesDashboardsPath, {
        statusCode,
        body: { message: 'Perses request failed' },
      });
      portal.visit(dashboardRoute);
      if (statusCode === 403) {
        observability.findAccessDenied().should('be.visible');
      } else {
        observability.findUnavailable().should('be.visible');
      }
      portal.findNavLink('API keys').should('be.visible');
    });
  }

  it('reports denied project access separately from a Perses failure', () => {
    setupObservabilityMocks();
    cy.intercept('GET', maasApi('/namespaces'), {
      statusCode: 403,
      body: { error: { code: '403', message: 'Forbidden' } },
    });
    portal.visit(dashboardRoute);
    observability.findProjectsAccessDenied().should('be.visible');
  });
});

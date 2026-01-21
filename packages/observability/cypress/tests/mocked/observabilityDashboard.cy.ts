import type { DashboardResource } from '@perses-dev/core';
import { mockDashboardConfig, mockStatus } from '@odh-dashboard/internal/__mocks__';
import { observabilityDashboardPage } from '../../pages/observabilityDashboard';

// Minimal test fixtures following the naming pattern from packages/observability/setup
// Dashboard names: dashboard-{N}-{name} for regular, dashboard-{N}-{name}-admin for admin-only
const createMockPersesDashboard = (name: string, displayName: string): DashboardResource => {
  const dashboard: DashboardResource = {
    kind: 'Dashboard',
    metadata: { name, project: 'opendatahub' },
    spec: {
      display: { name: displayName },
      duration: '1h',
      variables: [],
      panels: {},
      layouts: [],
    },
  };
  return dashboard;
};

const mockAdminDashboard = createMockPersesDashboard('dashboard-0-cluster-admin', 'Cluster');
const mockNonAdminDashboard = createMockPersesDashboard('dashboard-1-model', 'Model');

type InitInterceptsOptions = {
  dashboards?: DashboardResource[];
  isAdmin?: boolean;
};

const initIntercepts = ({ dashboards = [], isAdmin = false }: InitInterceptsOptions = {}) => {
  // Mock dashboard config with observability feature enabled
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ observabilityDashboard: true }));

  cy.interceptOdh('GET /api/status', mockStatus({ isAllowed: true, isAdmin }));

  // Mock the Perses dashboards API endpoint
  // The actual endpoint is: /perses/api/api/v1/projects/{namespace}/dashboards
  cy.intercept('GET', '/perses/api/api/v1/projects/*/dashboards', {
    statusCode: 200,
    body: dashboards,
  }).as('getPersesDashboards');
};

describe('Observability Dashboard', () => {
  it('should show empty state when no dashboards are found', () => {
    initIntercepts({ dashboards: [], isAdmin: false });

    observabilityDashboardPage.visit();

    observabilityDashboardPage.shouldHaveEmptyState();
  });

  it('should show both admin and non-admin dashboard tabs when user is admin', () => {
    initIntercepts({
      dashboards: [mockAdminDashboard, mockNonAdminDashboard],
      isAdmin: true,
    });

    observabilityDashboardPage.visit();

    // Admin users should see both dashboards
    observabilityDashboardPage.shouldHaveTab('Cluster');
    observabilityDashboardPage.shouldHaveTab('Model');
    observabilityDashboardPage.shouldHaveTabCount(2);
  });

  it('should show only non-admin dashboard tabs when user is not admin', () => {
    // Non-admin users should only see the non-admin dashboard
    // The filtering happens on the frontend, so we still return all dashboards
    // but the usePersesDashboards hook filters based on user admin status
    initIntercepts({
      dashboards: [mockAdminDashboard, mockNonAdminDashboard],
      isAdmin: false,
    });

    observabilityDashboardPage.visit();

    // Non-admin users should only see non-admin dashboards
    observabilityDashboardPage.shouldHaveTab('Model');
    observabilityDashboardPage.shouldHaveTabCount(1);
  });
});

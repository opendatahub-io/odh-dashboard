import type { DashboardResource } from '@perses-dev/core';
import type { K8sCondition } from '@odh-dashboard/internal/k8sTypes';
import { mockDashboardConfig, mockStatus } from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
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

const HEALTHY_DSCI_CONDITIONS: K8sCondition[] = [
  {
    lastTransitionTime: '2023-10-20T11:45:04Z',
    type: 'MonitoringReady',
    status: 'True',
    reason: 'Ready',
    message: 'Monitoring stack is available',
  },
  {
    lastTransitionTime: '2023-10-20T11:45:04Z',
    type: 'PersesAvailable',
    status: 'True',
    reason: 'Ready',
    message: 'Perses is available',
  },
];

type InitInterceptsOptions = {
  dashboards?: DashboardResource[];
  isAdmin?: boolean;
  dsciConditions?: K8sCondition[];
};

const initIntercepts = ({
  dashboards = [],
  isAdmin = false,
  dsciConditions = HEALTHY_DSCI_CONDITIONS,
}: InitInterceptsOptions = {}) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ observabilityDashboard: true }));

  cy.interceptOdh('GET /api/status', mockStatus({ isAllowed: true, isAdmin }));

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({ conditions: dsciConditions }));

  // Mock the global Perses dashboards API endpoint
  cy.intercept('GET', '/perses/api/api/v1/dashboards', {
    statusCode: 200,
    body: dashboards,
  }).as('getPersesDashboards');
};

describe('Observability Dashboard', () => {
  it('should show empty state when no dashboards exist', () => {
    initIntercepts({ dashboards: [], isAdmin: true });

    observabilityDashboardPage.visit();

    cy.wait('@getPersesDashboards');

    observabilityDashboardPage.shouldHaveEmptyState();
  });

  it('should hide nav and route when DSCI reports monitoring is not ready', () => {
    initIntercepts({
      dashboards: [],
      isAdmin: true,
      dsciConditions: [
        {
          lastTransitionTime: '2023-10-20T11:45:04Z',
          type: 'MonitoringReady',
          status: 'False',
          reason: 'MissingOperator',
          message: 'Cluster Observability Operator must be installed.',
        },
      ],
    });

    cy.visitWithLogin('/observe-and-monitor/dashboard');
    cy.findByTestId('not-found-page').should('exist');
  });

  it('should hide nav and route when MonitoringReady is True but PersesAvailable is False', () => {
    initIntercepts({
      dashboards: [],
      isAdmin: true,
      dsciConditions: [
        {
          lastTransitionTime: '2023-10-20T11:45:04Z',
          type: 'MonitoringReady',
          status: 'True',
          reason: 'Ready',
          message: 'Monitoring stack is available',
        },
        {
          lastTransitionTime: '2023-10-20T11:45:04Z',
          type: 'PersesAvailable',
          status: 'False',
          reason: 'PersesCRDNotFoundReason',
          message: 'Perses CRD not found in cluster.',
        },
      ],
    });

    cy.visitWithLogin('/observe-and-monitor/dashboard');
    cy.findByTestId('not-found-page').should('exist');
  });

  it('should show a load error when the Perses dashboards API is unreachable', () => {
    initIntercepts({ isAdmin: true });

    cy.intercept('GET', '/perses/api/api/v1/dashboards', {
      statusCode: 503,
      body: 'Service Unavailable',
    }).as('getPersesDashboards');

    observabilityDashboardPage.visit();

    cy.wait('@getPersesDashboards');

    observabilityDashboardPage.shouldHavePersesLoadError();
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

  // it('should show only non-admin dashboard tabs when user is not admin', () => {
  //   // Non-admin users should only see the non-admin dashboard
  //   // The filtering happens on the frontend, so we still return all dashboards
  //   // but the usePersesDashboards hook filters based on user admin status
  //   initIntercepts({
  //     dashboards: [mockAdminDashboard, mockNonAdminDashboard],
  //     isAdmin: false,
  //   });

  //   observabilityDashboardPage.visit();

  //   // Non-admin users should only see non-admin dashboards
  //   observabilityDashboardPage.shouldHaveTab('Model');
  //   observabilityDashboardPage.shouldHaveTabCount(1);
  // });

  // FIXME This is a temporary test to ensure that the dashboard tabs are only available for admins
  it('should show only dashboard tabs for admins', () => {
    // Non-admin users should only see the non-admin dashboard
    // The filtering happens on the frontend, so we still return all dashboards
    // but the usePersesDashboards hook filters based on user admin status
    initIntercepts({
      dashboards: [mockAdminDashboard, mockNonAdminDashboard],
      isAdmin: false,
    });

    cy.visitWithLogin('/observe-and-monitor/dashboard');
    cy.findByTestId('not-found-page').should('exist');
  });
});

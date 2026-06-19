import type { DashboardResource } from '@perses-dev/core';
import type { K8sCondition } from '@odh-dashboard/k8s-core';
import { mockDashboardConfig, mockStatus } from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { SelfSubjectAccessReviewModel } from '@odh-dashboard/internal/api/models';
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

const mockClusterDashboard = createMockPersesDashboard('dashboard-0-cluster-admin', 'Cluster');
const mockModelDashboard = createMockPersesDashboard('dashboard-1-model', 'Model');
const mockTenancyDashboard = createMockPersesDashboard('dashboard-2-tenancy', 'Tenancy');

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
  hasClusterMetricsAccess?: boolean;
  dsciConditions?: K8sCondition[];
};

const initIntercepts = ({
  dashboards = [],
  hasClusterMetricsAccess = false,
  dsciConditions = HEALTHY_DSCI_CONDITIONS,
}: InitInterceptsOptions = {}) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ observabilityDashboard: true }));

  cy.interceptOdh('GET /api/status', mockStatus({ isAllowed: true, isAdmin: false }));

  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const attrs = req.body?.spec?.resourceAttributes;
    if (attrs?.group !== 'monitoring.coreos.com') {
      req.reply(
        mockSelfSubjectAccessReview({
          ...attrs,
          allowed: true,
        }),
      );
      return;
    }
    expect(attrs).to.deep.include({
      group: 'monitoring.coreos.com',
      resource: 'prometheuses',
      subresource: 'api',
      verb: 'get',
      name: 'k8s',
      namespace: 'openshift-monitoring',
    });
    req.reply(
      mockSelfSubjectAccessReview({
        group: 'monitoring.coreos.com',
        resource: 'prometheuses',
        subresource: 'api',
        verb: 'get',
        name: 'k8s',
        namespace: 'openshift-monitoring',
        allowed: hasClusterMetricsAccess,
      }),
    );
  });

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({ conditions: dsciConditions }));

  // Mock the global Perses dashboards API endpoint
  cy.intercept('GET', '/perses/api/api/v1/dashboards', {
    statusCode: 200,
    body: dashboards,
  }).as('getPersesDashboards');
};

describe('Observability Dashboard', () => {
  it('should show empty state when no dashboards exist', () => {
    initIntercepts({ dashboards: [], hasClusterMetricsAccess: true });

    observabilityDashboardPage.visit();

    cy.wait('@getPersesDashboards');

    observabilityDashboardPage.shouldHaveEmptyState();
  });

  it('should hide nav and route when DSCI reports monitoring is not ready', () => {
    initIntercepts({
      dashboards: [],
      hasClusterMetricsAccess: true,
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
      hasClusterMetricsAccess: true,
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
    initIntercepts({ hasClusterMetricsAccess: true });

    cy.intercept('GET', '/perses/api/api/v1/dashboards', {
      statusCode: 503,
      body: 'Service Unavailable',
    }).as('getPersesDashboards');

    observabilityDashboardPage.visit();

    cy.wait('@getPersesDashboards');

    observabilityDashboardPage.shouldHavePersesLoadError();
  });

  it('should show all dashboard tabs when user has cluster metrics access', () => {
    initIntercepts({
      dashboards: [mockClusterDashboard, mockModelDashboard, mockTenancyDashboard],
      hasClusterMetricsAccess: true,
    });

    observabilityDashboardPage.visit();

    observabilityDashboardPage.shouldHaveTab('Cluster');
    observabilityDashboardPage.shouldHaveTab('Model');
    observabilityDashboardPage.shouldHaveTab('Tenancy');
    observabilityDashboardPage.shouldHaveTabCount(3);
  });

  it('should show only tenancy dashboard tabs when user does not have cluster metrics access', () => {
    initIntercepts({
      dashboards: [mockClusterDashboard, mockModelDashboard, mockTenancyDashboard],
      hasClusterMetricsAccess: false,
    });

    observabilityDashboardPage.visit();

    observabilityDashboardPage.shouldHaveTab('Tenancy');
    observabilityDashboardPage.shouldHaveTabCount(1);
  });
});

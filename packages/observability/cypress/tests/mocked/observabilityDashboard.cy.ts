import type { DashboardResource } from '@perses-dev/core';
import type { K8sCondition } from '@odh-dashboard/k8s-core';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockStatus } from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { SelfSubjectAccessReviewModel, ProjectModel } from '@odh-dashboard/internal/api/models';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockPersesDashboard } from '../../../src/__mocks__/observabilityFixtures';
import { observabilityDashboardPage } from '../../pages/observabilityDashboard';

const mockClusterDashboard = mockPersesDashboard({
  name: 'dashboard-0-cluster-admin',
  displayName: 'Cluster',
  project: 'opendatahub',
});
const mockModelDashboard = mockPersesDashboard({
  name: 'dashboard-1-model',
  displayName: 'Model',
  project: 'opendatahub',
});
const mockTenancyDashboard = mockPersesDashboard({
  name: 'dashboard-2-tenancy',
  displayName: 'Tenancy',
  project: 'opendatahub',
});

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
  it('renders glass-corrected surfaces under the glass appearance', () => {
    const glassDashboard = mockPersesDashboard({
      name: 'dashboard-glass',
      displayName: 'Glass',
      project: 'opendatahub',
      projectScoped: true,
    });
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([
        mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test Project' }),
      ]),
    );
    initIntercepts({ dashboards: [glassDashboard], hasClusterMetricsAccess: true });

    observabilityDashboardPage.visit();
    cy.wait('@getPersesDashboards');
    cy.findByTestId('variable-list').should('exist');

    // switch to glass via the stored appearance preference
    cy.window().then((win) => {
      win.localStorage.setItem('odh.dashboard.ui.contrastMode', JSON.stringify('glass'));
    });
    cy.reload();
    cy.findByTestId('variable-list').should('exist');
    cy.get('html').should('have.class', 'pf-v6-theme-glass');

    const computedBackground = (el: HTMLElement): string => {
      const view = el.ownerDocument.defaultView;
      if (!view) {
        throw new Error('element window unavailable');
      }
      return view.getComputedStyle(el).backgroundColor;
    };

    // panel group headers sit on the page surface instead of painting one
    cy.findByTestId('panel-group-header')
      .should('exist')
      .then(($el) => {
        expect(computedBackground($el[0])).to.equal('rgba(0, 0, 0, 0)');
      });

    // variable toolbar: no negative bottom margin, spacer below
    cy.findByTestId('variable-list').then(($el) => {
      const view = $el[0].ownerDocument.defaultView;
      if (!view) {
        throw new Error('element window unavailable');
      }
      const cs = view.getComputedStyle($el[0]);
      expect(cs.marginBottom).to.equal('0px');
      expect(cs.paddingBottom).to.equal('16px');
    });

    // open the variable dropdown: the floating menu stays opaque under glass
    cy.findByTestId('variable-list').find('input, button').first().click();
    cy.get('[role="listbox"]')
      .should('exist')
      .closest('.MuiPaper-root')
      .then(($paper) => {
        expect(computedBackground($paper[0]), 'floating menu is not translucent').to.not.match(
          /rgba\(.+,\s*0\.\d+\)/,
        );
      });

    // restore the default appearance for subsequent tests
    cy.window().then((win) => {
      win.localStorage.removeItem('odh.dashboard.ui.contrastMode');
    });
  });

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
    observabilityDashboardPage.shouldHaveNotFoundPage();
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
    observabilityDashboardPage.shouldHaveNotFoundPage();
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

  it('should show model and tenancy dashboard tabs when user does not have cluster metrics access', () => {
    initIntercepts({
      dashboards: [mockClusterDashboard, mockModelDashboard, mockTenancyDashboard],
      hasClusterMetricsAccess: false,
    });

    observabilityDashboardPage.visit();

    observabilityDashboardPage.shouldHaveTab('Model');
    observabilityDashboardPage.shouldHaveTab('Tenancy');
    observabilityDashboardPage.shouldHaveTabCount(2);
  });
});

import type { DashboardResource } from '@perses-dev/core';
import { mockPersesDashboard } from '@odh-dashboard/observability/__mocks__/observabilityFixtures';
import { maasApi, portalPath } from './portal';

export const persesDashboardsPath = portalPath('/perses/api/api/v1/dashboards');

export const setupObservabilityMocks = ({
  dashboards = [
    mockPersesDashboard({
      name: 'dashboard-1-model',
      displayName: 'Model',
      project: 'opendatahub',
    }),
  ],
  clusterMetricsAllowed = false,
  projects = [{ name: 'portal-project', displayName: 'Portal project' }],
}: {
  dashboards?: DashboardResource[];
  clusterMetricsAllowed?: boolean;
  projects?: { name: string; displayName: string }[];
} = {}): void => {
  cy.intercept('GET', maasApi('/namespaces'), { data: projects }).as('projects');
  cy.intercept('GET', persesDashboardsPath, dashboards).as('dashboards');
  cy.intercept(
    'POST',
    portalPath('/api/k8s/apis/authorization.k8s.io/v1/selfsubjectaccessreviews'),
    (request) => {
      expect(request.body.spec.resourceAttributes).to.deep.include({
        group: 'monitoring.coreos.com',
        resource: 'prometheuses',
        subresource: 'api',
        name: 'k8s',
        namespace: 'openshift-monitoring',
        verb: 'get',
      });
      request.reply({
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        status: { allowed: clusterMetricsAllowed },
      });
    },
  ).as('metricsAccess');
};

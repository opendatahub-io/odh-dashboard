import type { DashboardResource } from '@odh-dashboard/observability/embeddable';
import { mockPersesDashboard } from '@odh-dashboard/observability/__mocks__/observabilityFixtures';
import { maasApi } from './portal';

export const usageDashboardsPath = maasApi('/usage-dashboards');

export const setupObservabilityMocks = ({
  isMaaSAdmin = false,
  dashboards = [
    mockPersesDashboard({
      name: 'dashboard-5-maas-usage-logs',
      displayName: 'My Usage',
      project: 'redhat-ods-monitoring',
    }),
    ...(isMaaSAdmin
      ? [
          mockPersesDashboard({
            name: 'dashboard-4-maas-usage-logs-admin',
            displayName: 'Usage',
            project: 'redhat-ods-monitoring',
          }),
        ]
      : []),
  ],
}: {
  isMaaSAdmin?: boolean;
  dashboards?: DashboardResource[];
} = {}): void => {
  cy.intercept('GET', usageDashboardsPath, { data: dashboards }).as('dashboards');
};

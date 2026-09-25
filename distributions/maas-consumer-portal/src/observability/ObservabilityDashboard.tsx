import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant, PageSection } from '@patternfly/react-core';
import { ExclamationCircleIcon, WrenchIcon } from '@patternfly/react-icons';
import { DashboardView } from '@odh-dashboard/observability/dashboard';
import { DASHBOARD_ROUTE, PERSES_PROXY_BASE_PATH } from './paths';
import { useObservabilityDashboardData } from './useObservabilityDashboardData';
import PortalClusterDetailsVariablesProvider from '../providers/PortalClusterDetailsVariablesProvider';
import { PORTAL_BASE_PATH } from '../portalPaths';

const NoProjects: React.FC = () => (
  <EmptyState
    headingLevel="h4"
    icon={WrenchIcon}
    titleText="No projects"
    data-testid="portal-no-projects"
  >
    <EmptyStateBody>
      To view project dashboards and metrics, ask for access to a project.
    </EmptyStateBody>
  </EmptyState>
);

const ObservabilityUnavailable: React.FC = () => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      icon={ExclamationCircleIcon}
      titleText="Observability dashboard unavailable"
      variant={EmptyStateVariant.lg}
      data-testid="portal-observability-unavailable"
    >
      <EmptyStateBody>
        Observability is not enabled for this portal or the service cannot be reached.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

type AccessDeniedProps = {
  title: string;
  children: React.ReactNode;
  testId: string;
};

const AccessDenied: React.FC<AccessDeniedProps> = ({ title, children, testId }) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      icon={ExclamationCircleIcon}
      titleText={title}
      variant={EmptyStateVariant.lg}
      data-testid={testId}
    >
      <EmptyStateBody>{children}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

const ObservabilityDashboard: React.FC = () => {
  const dashboardData = useObservabilityDashboardData();

  return (
    <DashboardView
      {...dashboardData}
      dashboardsLoadErrorPage={<ObservabilityUnavailable />}
      dashboardsForbiddenErrorPage={
        <AccessDenied
          title="Access to observability dashboards is denied"
          testId="portal-observability-access-denied"
        >
          You do not have permission to view observability dashboards. Contact your administrator to
          request access.
        </AccessDenied>
      }
      projectsForbiddenErrorPage={
        <AccessDenied
          title="Access to projects is denied"
          testId="portal-observability-projects-access-denied"
        >
          You do not have permission to list projects for observability dashboards. Contact your
          administrator to request access.
        </AccessDenied>
      }
      persesProxyBasePath={PERSES_PROXY_BASE_PATH}
      routeBasePath={DASHBOARD_ROUTE}
      browserBasePath={PORTAL_BASE_PATH}
      ClusterDetailsAdapter={PortalClusterDetailsVariablesProvider}
      noProjectsEmptyState={<NoProjects />}
    />
  );
};

export default ObservabilityDashboard;

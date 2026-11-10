import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import {
  PersesDashboard,
  PersesProvider,
  PersesTimeControls,
  PersesVariables,
} from '@odh-dashboard/observability/embeddable';
import { PERSES_PROXY_BASE_PATH } from './paths';
import { useObservabilityDashboardData } from './useObservabilityDashboardData';
import { PORTAL_BASE_PATH } from '../portalPaths';

const DASHBOARD_PATH = '/observe-and-monitor/dashboard';
const DASHBOARD_TITLE = 'Observability metrics';
const DASHBOARD_DESCRIPTION =
  'Monitor the health, performance, and resource usage of your AI workloads, cluster, and models.';

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

const AccessDenied: React.FC = () => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      icon={ExclamationCircleIcon}
      titleText="Access to observability dashboards is denied"
      variant={EmptyStateVariant.lg}
      data-testid="portal-observability-access-denied"
    >
      <EmptyStateBody>
        You do not have permission to view observability dashboards. Contact your administrator to
        request access.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

const TimeControls: React.FC = () => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>Time period:</FlexItem>
    <FlexItem>
      <PersesTimeControls />
    </FlexItem>
  </Flex>
);

const ObservabilityDashboard: React.FC = () => {
  const { dashboards, dashboardsLoaded, dashboardsError } = useObservabilityDashboardData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (dashboardsError) {
    const status =
      'status' in dashboardsError && typeof dashboardsError.status === 'number'
        ? dashboardsError.status
        : getGenericErrorCode(dashboardsError);
    return (
      <ApplicationsPage
        title={DASHBOARD_TITLE}
        description={DASHBOARD_DESCRIPTION}
        loaded
        empty={false}
        loadError={dashboardsError}
        loadErrorPage={
          status === 401 || status === 403 ? <AccessDenied /> : <ObservabilityUnavailable />
        }
      />
    );
  }

  if (!dashboardsLoaded) {
    return (
      <ApplicationsPage
        title={DASHBOARD_TITLE}
        description={DASHBOARD_DESCRIPTION}
        loaded={false}
        empty={false}
      />
    );
  }

  if (dashboards.length === 0) {
    return (
      <ApplicationsPage
        title={DASHBOARD_TITLE}
        description={DASHBOARD_DESCRIPTION}
        loaded
        empty
        emptyMessage="No usage dashboards were found."
      />
    );
  }

  const requestedDashboard = searchParams.get('dashboard');
  const activeDashboard =
    dashboards.find(({ metadata }) => metadata.name === requestedDashboard) ?? dashboards[0];
  const activeDashboardName = activeDashboard.metadata.name;
  const dashboardUrl = (name: string): string => {
    const params = new URLSearchParams(searchParams);
    params.set('dashboard', name);
    return `${DASHBOARD_PATH}?${params.toString()}`;
  };
  const handleTabSelect = (
    event: React.MouseEvent<HTMLElement>,
    eventKey: string | number,
  ): void => {
    if (event.metaKey || event.ctrlKey) {
      return;
    }
    event.preventDefault();
    navigate(dashboardUrl(String(eventKey)), { replace: true });
  };

  return (
    <PersesProvider
      key={activeDashboardName}
      dashboardResource={activeDashboard}
      syncToUrl
      persesProxyBasePath={PERSES_PROXY_BASE_PATH}
    >
      <ApplicationsPage
        title={DASHBOARD_TITLE}
        description={DASHBOARD_DESCRIPTION}
        loaded
        empty={false}
        headerAction={<TimeControls />}
      >
        <Tabs
          data-testid="observability-dashboard-tabs"
          activeKey={activeDashboardName}
          onSelect={handleTabSelect}
          aria-label="Observability dashboard tabs"
          mountOnEnter
          unmountOnExit
        >
          {dashboards.map((dashboard) => (
            <Tab
              key={dashboard.metadata.name}
              eventKey={dashboard.metadata.name}
              title={
                <TabTitleText>
                  {dashboard.spec.display?.name || dashboard.metadata.name}
                </TabTitleText>
              }
              href={`${PORTAL_BASE_PATH}${dashboardUrl(dashboard.metadata.name)}`}
            >
              <PageSection hasBodyWrapper={false} isFilled>
                <PersesVariables />
                <PersesDashboard />
              </PageSection>
            </Tab>
          ))}
        </Tabs>
      </ApplicationsPage>
    </PersesProvider>
  );
};

export default ObservabilityDashboard;

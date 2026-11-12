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
const DASHBOARD_TITLE = 'Observability';
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
      titleText="No access"
      variant={EmptyStateVariant.lg}
      data-testid="portal-observability-access-denied"
    >
      <EmptyStateBody>
        You don&apos;t have permission to view the observability dashboard. To request permission,
        contact your administrator.
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Seed from window.location ONCE and keep a sticky selection: Perses syncToUrl
  // (time range) rewrites the query string and drops `dashboard=`, which would
  // otherwise reset the tab on refresh.
  const [selectedDashboardName, setSelectedDashboardName] = React.useState(
    () => new URLSearchParams(window.location.search).get('dashboard') ?? '',
  );

  React.useEffect(() => {
    const fromUrl = searchParams.get('dashboard');
    if (fromUrl && fromUrl !== selectedDashboardName) {
      setSelectedDashboardName(fromUrl);
    }
  }, [searchParams, selectedDashboardName]);

  const activeDashboard = React.useMemo(
    () =>
      dashboards.find(({ metadata }) => metadata.name === selectedDashboardName) ?? dashboards[0],
    [dashboards, selectedDashboardName],
  );
  const activeDashboardName = dashboards.length > 0 ? activeDashboard.metadata.name : '';

  // Re-assert `dashboard=` after Perses syncToUrl drops it, so refresh keeps the
  // tab. setSearchParams only — a full navigate() here would loop and wipe the
  // time-range params.
  React.useEffect(() => {
    if (!activeDashboardName) {
      return;
    }
    // Never overwrite a URL that already pins a dashboard - the sync effect
    // above adopts it. Writing here before that adoption lands would ping-pong
    // between the two effects (URL <-> selection) forever.
    if (searchParams.get('dashboard')) {
      return;
    }
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('dashboard', activeDashboardName);
        return params;
      },
      { replace: true },
    );
  }, [activeDashboardName, searchParams, setSearchParams]);

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
    setSelectedDashboardName(String(eventKey));
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

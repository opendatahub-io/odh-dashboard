import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import type { DashboardResource } from '@perses-dev/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import HeaderTimeRangeControls from './HeaderTimeRangeControls';
import NamespaceUrlSync from './NamespaceUrlSync';
import PersesProvider, { PersesDashboardGate } from '../perses/embeddable/PersesProvider';
import PersesDashboard from '../perses/embeddable/PersesDashboard';
import PersesVariables from '../perses/embeddable/PersesVariables';
import useRelativeLinkHandler from '../hooks/useRelativeLinkHandler';
import {
  buildDashboardUrl,
  BASE_PATH,
  getDashboardDisplayName,
  hasClusterDetailsVariables,
  hasNamespaceVariable,
  DASHBOARD_URL_PARAM,
  NAMESPACE_URL_PARAM,
} from '../utils/dashboardUtils';
import { transformNamespaceVariable } from '../utils/transformDashboardVariables';
import type { NamespaceOption } from '../utils/transformDashboardVariables';

export type DashboardContentProps = {
  dashboards: DashboardResource[];
  projects: NamespaceOption[];
  persesProxyBasePath?: string;
  browserBasePath?: string;
  ClusterDetailsAdapter: React.ComponentType;
};

/**
 * Dashboard content with tabs for multiple dashboards
 */
const DashboardContent: React.FC<DashboardContentProps> = ({
  dashboards,
  projects,
  persesProxyBasePath,
  browserBasePath = '',
  ClusterDetailsAdapter,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Intercept relative link clicks in the Perses dashboard and use React Router navigation
  const setRelativeLinkHandlerRef = useRelativeLinkHandler(browserBasePath);

  // Seed from window.location ONCE: Perses syncToUrl (time range) rewrites the
  // query string and drops params it does not own (`dashboard=`,
  // `var-namespace=`). Reading live searchParams would lose the selection after
  // that rewrite, remount PersesProvider without the URL defaults, and reset
  // both the tab and the project dropdown on refresh.
  const [initialSearchParams] = React.useState(() => new URLSearchParams(window.location.search));

  // Get initial namespace value from URL to preserve selection across tab switches
  const initialNamespaceValue = React.useMemo(() => {
    const urlValue = initialSearchParams.get(NAMESPACE_URL_PARAM);
    if (!urlValue) {
      return undefined;
    }
    // Handle comma-separated values for multi-select
    return urlValue.includes(',') ? urlValue.split(',') : urlValue;
  }, [initialSearchParams]);

  // Transform dashboards to use static namespace options when projects are available
  // This prevents Perses from running a Prometheus query when we can provide the options directly
  // Also sets the initial namespace value from URL to preserve selection across tab switches
  const transformedDashboards = React.useMemo(
    () =>
      dashboards.map((dashboard) =>
        transformNamespaceVariable(dashboard, projects, initialNamespaceValue),
      ),
    [dashboards, projects, initialNamespaceValue],
  );

  // Sticky tab selection: seeded from the initial URL, updated by tab clicks and
  // legitimate URL changes (back/forward), but never reset by Perses dropping
  // the `dashboard=` param from the query string.
  const [selectedDashboardName, setSelectedDashboardName] = React.useState(
    () => initialSearchParams.get(DASHBOARD_URL_PARAM) ?? '',
  );

  React.useEffect(() => {
    const fromUrl = searchParams.get(DASHBOARD_URL_PARAM);
    if (fromUrl && fromUrl !== selectedDashboardName) {
      setSelectedDashboardName(fromUrl);
    }
  }, [searchParams, selectedDashboardName]);

  // Find the active dashboard by name, defaulting to first dashboard
  const activeDashboardIndex = React.useMemo(() => {
    if (!selectedDashboardName) {
      return 0;
    }
    const index = transformedDashboards.findIndex((d) => d.metadata.name === selectedDashboardName);
    return index >= 0 ? index : 0;
  }, [transformedDashboards, selectedDashboardName]);

  // Handle tab selection - use React Router for normal clicks, allow browser default for cmd/ctrl+click
  const handleTabSelect = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, eventKey: string | number) => {
      // Allow cmd+click (Mac) or ctrl+click (Windows/Linux) to open in new tab
      if (event.metaKey || event.ctrlKey) {
        return;
      }
      event.preventDefault();
      setSelectedDashboardName(String(eventKey));
      // Use replace to avoid creating extra history entries when switching tabs
      navigate(buildDashboardUrl(String(eventKey), searchParams.toString()), {
        replace: true,
      });
    },
    [navigate, searchParams],
  );

  // Active dashboard name must be computed before any early return so the
  // URL re-assert effect below always runs in the same hook order.
  const activeDashboardName = transformedDashboards[activeDashboardIndex]?.metadata.name ?? '';

  // Re-assert `dashboard=` after Perses syncToUrl rewrites the query string
  // without it, so a browser refresh keeps the selected tab. setSearchParams
  // only — a full navigate() here would loop and wipe the time-range params.
  React.useEffect(() => {
    if (!activeDashboardName) {
      return;
    }
    // Never overwrite a URL that already pins a dashboard - the sync effect
    // above adopts it. Writing here before that adoption lands would ping-pong
    // between the two effects (URL <-> selection) forever.
    if (searchParams.get(DASHBOARD_URL_PARAM)) {
      return;
    }
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set(DASHBOARD_URL_PARAM, activeDashboardName);
        return params;
      },
      { replace: true },
    );
  }, [activeDashboardName, searchParams, setSearchParams]);

  if (transformedDashboards.length === 0) {
    return null;
  }

  const activeDashboard = transformedDashboards[activeDashboardIndex] || transformedDashboards[0];
  const needsClusterDetails = hasClusterDetailsVariables(activeDashboard);

  return (
    <div>
      <PersesProvider
        key={activeDashboardName}
        dashboardResource={activeDashboard}
        syncToUrl
        persesProxyBasePath={persesProxyBasePath}
      >
        {needsClusterDetails && <ClusterDetailsAdapter />}
        {hasNamespaceVariable(activeDashboard) && <NamespaceUrlSync />}
        <ApplicationsPage
          title={DASHBOARD_PAGE_TITLE}
          description={DASHBOARD_PAGE_DESCRIPTION}
          loaded
          empty={false}
          headerAction={<HeaderTimeRangeControls />}
        >
          <Tabs
            data-testid="observability-dashboard-tabs"
            activeKey={activeDashboardName}
            onSelect={handleTabSelect}
            aria-label="Observability dashboard tabs"
            mountOnEnter
            unmountOnExit
          >
            {transformedDashboards.map((dashboard) => (
              <Tab
                key={dashboard.metadata.name}
                eventKey={dashboard.metadata.name}
                title={<TabTitleText>{getDashboardDisplayName(dashboard)}</TabTitleText>}
                href={buildDashboardUrl(
                  dashboard.metadata.name,
                  searchParams.toString(),
                  `${browserBasePath}${BASE_PATH}`,
                )}
              >
                <PageSection hasBodyWrapper={false} isFilled>
                  <div ref={setRelativeLinkHandlerRef}>
                    <PersesVariables />
                    <PersesDashboardGate dashboardResource={activeDashboard}>
                      <PersesDashboard />
                    </PersesDashboardGate>
                  </div>
                </PageSection>
              </Tab>
            ))}
          </Tabs>
        </ApplicationsPage>
      </PersesProvider>
    </div>
  );
};

export default DashboardContent;

import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import type { DashboardResource } from '@perses-dev/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import HeaderTimeRangeControls from './HeaderTimeRangeControls';
import ClusterDetailsVariablesProvider from './ClusterDetailsVariablesProvider';
import NamespaceUrlSync from './NamespaceUrlSync';
import PersesWrapper from '../perses/PersesWrapper';
import PersesBoard from '../perses/PersesBoard';
import useRelativeLinkHandler from '../hooks/useRelativeLinkHandler';
import {
  buildDashboardUrl,
  getDashboardDisplayName,
  hasClusterDetailsVariables,
  DASHBOARD_QUERY_PARAM,
} from '../utils/dashboardUtils';
import {
  transformNamespaceVariable,
  NAMESPACE_URL_PARAM,
} from '../utils/transformDashboardVariables';

export type DashboardContentProps = {
  dashboards: DashboardResource[];
};

/**
 * Dashboard content with tabs for multiple dashboards
 * Only rendered when we have valid dashboardResources
 */
const DashboardContent: React.FC<DashboardContentProps> = ({ dashboards }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects } = React.useContext(ProjectsContext);

  // Intercept relative link clicks in the Perses dashboard and use React Router navigation
  const setRelativeLinkHandlerRef = useRelativeLinkHandler();

  // Get dashboard name from query param
  const dashboardNameFromUrl = searchParams.get(DASHBOARD_QUERY_PARAM) || '';

  // Get all project names to populate the namespace variable options
  const allProjectNames = React.useMemo(
    () => projects.map((project) => project.metadata.name),
    [projects],
  );

  // Get initial namespace value from URL to preserve selection across tab switches
  const initialNamespaceValue = React.useMemo(() => {
    const urlValue = searchParams.get(NAMESPACE_URL_PARAM);
    if (!urlValue) {
      return undefined;
    }
    // Handle comma-separated values for multi-select
    return urlValue.includes(',') ? urlValue.split(',') : urlValue;
  }, [searchParams]);

  // Transform the active dashboard to use static namespace options when projects are available
  // This prevents Perses from running a Prometheus query when we can provide the options directly
  // Also sets the initial namespace value from URL to preserve selection across tab switches
  const transformedDashboards = React.useMemo(
    () =>
      dashboards.map((dashboard) =>
        transformNamespaceVariable(dashboard, allProjectNames, initialNamespaceValue),
      ),
    [dashboards, allProjectNames, initialNamespaceValue],
  );

  // Find the active dashboard by name, defaulting to first dashboard
  const activeDashboardIndex = React.useMemo(() => {
    if (!dashboardNameFromUrl) {
      return 0;
    }
    const index = transformedDashboards.findIndex((d) => d.metadata.name === dashboardNameFromUrl);
    return index >= 0 ? index : 0;
  }, [transformedDashboards, dashboardNameFromUrl]);

  const activeDashboard = transformedDashboards[activeDashboardIndex] || transformedDashboards[0];
  const activeDashboardName = activeDashboard.metadata.name;

  // Check if the active dashboard needs cluster details variables
  const needsClusterDetails = hasClusterDetailsVariables(activeDashboard);

  // Handle tab selection - use React Router for normal clicks, allow browser default for cmd/ctrl+click
  const handleTabSelect = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, eventKey: string | number) => {
      // Allow cmd+click (Mac) or ctrl+click (Windows/Linux) to open in new tab
      if (event.metaKey || event.ctrlKey) {
        return;
      }
      event.preventDefault();
      // Use replace to avoid creating extra history entries when switching tabs
      navigate(buildDashboardUrl(String(eventKey), searchParams.toString()), { replace: true });
    },
    [navigate, searchParams],
  );

  // Guard against empty dashboards array
  if (transformedDashboards.length === 0) {
    return null;
  }

  return (
    <div ref={setRelativeLinkHandlerRef}>
      <PersesWrapper key={activeDashboardName} dashboardResource={activeDashboard}>
        {needsClusterDetails && <ClusterDetailsVariablesProvider />}
        <NamespaceUrlSync />
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
                href={buildDashboardUrl(dashboard.metadata.name, searchParams.toString())}
              >
                <PageSection hasBodyWrapper={false} isFilled>
                  <PersesBoard />
                </PageSection>
              </Tab>
            ))}
          </Tabs>
        </ApplicationsPage>
      </PersesWrapper>
    </div>
  );
};

export default DashboardContent;

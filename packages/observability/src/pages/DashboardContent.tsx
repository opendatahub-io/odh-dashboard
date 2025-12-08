import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import type { DashboardResource } from '@perses-dev/core';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import HeaderTimeRangeControls from './HeaderTimeRangeControls';
import HeaderProjectSelector from './HeaderProjectSelector';
import PersesWrapper from '../perses/PersesWrapper';
import PersesBoard from '../perses/PersesBoard';
import {
  buildDashboardUrl,
  getDashboardDisplayName,
  DASHBOARD_QUERY_PARAM,
} from '../utils/dashboardUtils';

export type DashboardContentProps = {
  dashboards: DashboardResource[];
};

/**
 * Dashboard content with tabs for multiple dashboards
 * Only rendered when we have valid dashboardResources
 */
const DashboardContent: React.FC<DashboardContentProps> = ({ dashboards }) => {
  const navigate = useNavigate();
  const { '*': projectName = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { projects } = React.useContext(ProjectsContext);

  // Get dashboard name from query param
  const dashboardNameFromUrl = searchParams.get(DASHBOARD_QUERY_PARAM) || '';

  // Get all project names for the regex union when "All projects" is selected
  const allProjectNames = React.useMemo(
    () => projects.map((project) => project.metadata.name),
    [projects],
  );

  // Find the active dashboard by name, defaulting to first dashboard
  const activeDashboardIndex = React.useMemo(() => {
    if (!dashboardNameFromUrl) {
      return 0;
    }
    const index = dashboards.findIndex((d) => d.metadata.name === dashboardNameFromUrl);
    return index >= 0 ? index : 0;
  }, [dashboards, dashboardNameFromUrl]);

  // Guard against empty dashboards array
  if (dashboards.length === 0) {
    return null;
  }

  const activeDashboard = dashboards[activeDashboardIndex] || dashboards[0];
  const activeDashboardName = activeDashboard.metadata.name;

  // Handle tab selection - prevent default anchor behavior and use React Router
  const handleTabSelect = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, eventKey: string | number) => {
      event.preventDefault();
      navigate(buildDashboardUrl(projectName, String(eventKey)));
    },
    [navigate, projectName],
  );

  // Handle project change - update URL path
  const handleProjectChange = React.useCallback(
    (newProject: string) => {
      // Keep the current dashboard selection when changing projects
      navigate(buildDashboardUrl(newProject, activeDashboardName));
    },
    [navigate, activeDashboardName],
  );

  return (
    <PersesWrapper key={activeDashboardName} dashboardResource={activeDashboard}>
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded
        empty={false}
        headerAction={<HeaderTimeRangeControls />}
        headerContent={
          <HeaderProjectSelector
            selectedProject={projectName}
            onProjectChange={handleProjectChange}
            allProjectNames={allProjectNames}
          />
        }
      >
        <Tabs
          activeKey={activeDashboardName}
          onSelect={handleTabSelect}
          aria-label="Dashboard tabs"
          mountOnEnter
          unmountOnExit
        >
          {dashboards.map((dashboard) => (
            <Tab
              key={dashboard.metadata.name}
              eventKey={dashboard.metadata.name}
              title={<TabTitleText>{getDashboardDisplayName(dashboard)}</TabTitleText>}
              href={buildDashboardUrl(projectName, dashboard.metadata.name)}
            >
              <PageSection hasBodyWrapper={false} isFilled>
                <PersesBoard />
              </PageSection>
            </Tab>
          ))}
        </Tabs>
      </ApplicationsPage>
    </PersesWrapper>
  );
};

export default DashboardContent;

import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- Host shell wrapper for federated observability routes
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import DashboardContent from './DashboardContent';
import ObservabilityNoProjects from './ObservabilityNoProjects';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import { usePersesDashboards } from '../api/usePersesDashboards';
import { hasNamespaceVariable } from '../utils/dashboardUtils';

const PERSES_LOAD_ERROR_TITLE = 'Unable to reach observability dashboards';

const NO_DASHBOARDS_MESSAGE =
  'No dashboards were found. Verify that the monitoring stack is configured correctly.';

const DashboardPage: React.FC = () => {
  const {
    projects,
    loaded: projectsLoaded,
    loadError: projectsLoadError,
  } = React.useContext(ProjectsContext);
  const { dashboards, loaded: dashboardsLoaded, error: dashboardsError } = usePersesDashboards();

  const projectNames = React.useMemo(
    () => projects.map((project) => project.metadata.name),
    [projects],
  );

  // Without projects, hide namespace-scoped dashboards (tenancy proxy Forbidden). Cluster
  // dashboards without a namespace variable can still render.
  const viewableDashboards = React.useMemo(
    () =>
      projectNames.length === 0
        ? dashboards.filter((dashboard) => !hasNamespaceVariable(dashboard))
        : dashboards,
    [dashboards, projectNames],
  );

  if (dashboardsError || projectsLoadError) {
    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded
        empty={false}
        loadError={dashboardsError || projectsLoadError}
        errorMessage={PERSES_LOAD_ERROR_TITLE}
      />
    );
  }

  if (!projectsLoaded || !dashboardsLoaded) {
    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded={false}
        empty={false}
      />
    );
  }

  // No projects and every dashboard was namespace-scoped (filtered out of viewableDashboards)
  if (projectNames.length === 0 && viewableDashboards.length === 0 && dashboards.length > 0) {
    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded
        empty
        emptyStatePage={<ObservabilityNoProjects />}
      />
    );
  }

  if (viewableDashboards.length > 0) {
    return <DashboardContent dashboards={viewableDashboards} projectNames={projectNames} />;
  }

  return (
    <ApplicationsPage
      title={DASHBOARD_PAGE_TITLE}
      description={DASHBOARD_PAGE_DESCRIPTION}
      loaded
      empty
      emptyMessage={NO_DASHBOARDS_MESSAGE}
    />
  );
};

export default DashboardPage;

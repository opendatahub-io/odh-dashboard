import * as React from 'react';
import type { DashboardResource } from '@perses-dev/core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import DashboardContent from './DashboardContent';
import { DASHBOARD_PAGE_DESCRIPTION, DASHBOARD_PAGE_TITLE } from './const';
import { hasNamespaceVariable } from '../utils/dashboardUtils';
import type { NamespaceOption } from '../utils/transformDashboardVariables';

const PERSES_LOAD_ERROR_TITLE = 'Unable to reach observability dashboards';
const NO_DASHBOARDS_MESSAGE =
  'No dashboards were found. Verify that the monitoring stack is configured correctly.';
const PROJECTS_LOAD_ERROR_TITLE = 'Unable to load projects';

const isForbiddenError = (error: Error | undefined): boolean =>
  Boolean(error && 'status' in error && error.status === 403);

export type DashboardViewProps = {
  dashboards: DashboardResource[];
  dashboardsLoaded: boolean;
  dashboardsError?: Error;
  dashboardsLoadErrorPage?: React.ReactNode;
  dashboardsForbiddenErrorPage?: React.ReactNode;
  projects: NamespaceOption[];
  projectsLoaded: boolean;
  projectsLoadError?: Error;
  projectsForbiddenErrorPage?: React.ReactNode;
  persesProxyBasePath?: string;
  routeBasePath?: string;
  browserBasePath?: string;
  ClusterDetailsAdapter: React.ComponentType;
  noProjectsEmptyState?: React.ReactNode;
};

/** Host-neutral dashboard view. Hosts supply user-scoped dashboards and projects. */
const DashboardView: React.FC<DashboardViewProps> = ({
  dashboards,
  dashboardsLoaded,
  dashboardsError,
  dashboardsLoadErrorPage,
  dashboardsForbiddenErrorPage,
  projects,
  projectsLoaded,
  projectsLoadError,
  projectsForbiddenErrorPage,
  persesProxyBasePath,
  routeBasePath,
  browserBasePath,
  ClusterDetailsAdapter,
  noProjectsEmptyState,
}) => {
  const projectNames = React.useMemo(() => projects.map(({ name }) => name), [projects]);
  const viewableDashboards = React.useMemo(
    () =>
      projectNames.length === 0
        ? dashboards.filter((dashboard) => !hasNamespaceVariable(dashboard))
        : dashboards,
    [dashboards, projectNames],
  );

  if (dashboardsError || projectsLoadError) {
    const isDashboardError = Boolean(dashboardsError);
    const loadError = dashboardsError || projectsLoadError;
    let loadErrorPage: React.ReactNode;

    if (dashboardsError) {
      loadErrorPage = isForbiddenError(dashboardsError)
        ? dashboardsForbiddenErrorPage
        : dashboardsLoadErrorPage;
    } else if (isForbiddenError(projectsLoadError)) {
      loadErrorPage = projectsForbiddenErrorPage;
    }

    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded
        empty={false}
        loadError={loadError}
        loadErrorPage={loadErrorPage}
        errorMessage={isDashboardError ? PERSES_LOAD_ERROR_TITLE : PROJECTS_LOAD_ERROR_TITLE}
      />
    );
  }

  if (!dashboardsLoaded || !projectsLoaded) {
    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded={false}
        empty={false}
      />
    );
  }

  if (projectNames.length === 0 && viewableDashboards.length === 0 && dashboards.length > 0) {
    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded
        empty
        emptyStatePage={noProjectsEmptyState}
      />
    );
  }

  if (viewableDashboards.length > 0) {
    return (
      <DashboardContent
        dashboards={viewableDashboards}
        projectNames={projects}
        persesProxyBasePath={persesProxyBasePath}
        routeBasePath={routeBasePath}
        browserBasePath={browserBasePath}
        ClusterDetailsAdapter={ClusterDetailsAdapter}
      />
    );
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

export default DashboardView;

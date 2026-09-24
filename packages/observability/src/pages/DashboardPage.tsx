import * as React from 'react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useClusterInfo } from '@odh-dashboard/internal/redux/selectors/clusterInfo';
import { useWatchOperatorSubscriptionStatus } from '@odh-dashboard/internal/utilities/useWatchOperatorSubscriptionStatus';
import ObservabilityNoProjects from './ObservabilityNoProjects';
import { ClusterDetailsVariablesProvider } from './ClusterDetailsVariablesProvider';
import DashboardView from './DashboardView';
import { useClusterDetails } from '../api/useClusterDetails';
import { usePersesDashboards } from '../api/usePersesDashboards';

/**
 * TODO: Move this adapter to the frontend package once observability exposes a host-to-module adapter
 * contract. The frontend must provide this component to DashboardPage across the Module Federation
 * boundary so the package can remain host-neutral.
 */
const MainDashboardClusterDetailsVariablesProvider: React.FC = () => {
  // Get API server URL from redux state (same source as AboutDialog)
  const { serverURL } = useClusterInfo();

  // Get operator subscription status for channel (same source as AboutDialog)
  const [subStatus] = useWatchOperatorSubscriptionStatus();

  // Get OpenShift version and infrastructure provider
  const { data: clusterDetails, loaded: clusterDetailsLoaded } = useClusterDetails();

  const details = React.useMemo(
    () => ({
      apiServer: serverURL,
      channel: subStatus?.channel,
      openshiftVersion: clusterDetails.openshiftVersion,
      infrastructureProvider: clusterDetails.infrastructureProvider,
    }),
    [clusterDetails, serverURL, subStatus],
  );

  return <ClusterDetailsVariablesProvider details={details} detailsLoaded={clusterDetailsLoaded} />;
};

const DashboardPage: React.FC = () => {
  const {
    projects,
    loaded: projectsLoaded,
    loadError: projectsLoadError,
  } = React.useContext(ProjectsContext);
  const { dashboards, loaded: dashboardsLoaded, error: dashboardsError } = usePersesDashboards();

  const dashboardProjects = React.useMemo(
    () =>
      projects.map((project) => ({ name: project.metadata.name, label: project.metadata.name })),
    [projects],
  );
  return (
    <DashboardView
      dashboards={dashboards}
      dashboardsLoaded={dashboardsLoaded}
      dashboardsError={dashboardsError}
      projects={dashboardProjects}
      projectsLoaded={projectsLoaded}
      projectsLoadError={projectsLoadError}
      ClusterDetailsAdapter={MainDashboardClusterDetailsVariablesProvider}
      noProjectsEmptyState={<ObservabilityNoProjects />}
    />
  );
};

export default DashboardPage;

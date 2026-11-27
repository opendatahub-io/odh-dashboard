import React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProjectRouteSync } from '@odh-dashboard/plugin-core/routing';
import {
  useWorkingProject,
  WorkingProjectStatusValue,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { ApplicationsPage } from 'mod-arch-shared';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import { autoragExperimentsPathname } from '~/app/utilities/routes';

const getProjectPath = (name: string) => `${autoragExperimentsPathname}/${name}`;
const projectListLoadError = new Error('Unable to load the project list. Please try again later.');

const UnifiedProjectRoute: React.FC = () => {
  const { namespace } = useParams();
  const { activeProject, projects, selectProject, registerProjectRouteSync, status } =
    useWorkingProject();

  useWorkingProjectRouteSync({
    activeProjectName: activeProject?.name,
    routeProjectName: namespace,
    projects,
    selectProject,
    registerProjectRouteSync,
    enabled: true,
    getProjectPath,
    preserveLocationOnProjectChange: false,
  });

  const loading = status === WorkingProjectStatusValue.Loading;
  const unavailable =
    status === WorkingProjectStatusValue.ProjectSourceError ||
    status === WorkingProjectStatusValue.ProviderAbsent;
  const validProject = namespace && projects.some(({ name }) => name === namespace);

  if (!loading && !unavailable && validProject) {
    // Forms, filters, selections, and dialogs belong to the URL project.
    return <Outlet key={namespace} />;
  }

  if (!namespace && !loading && !unavailable && activeProject) {
    return <Navigate to={getProjectPath(activeProject.name)} replace />;
  }

  // A restricted list cannot establish that an unverified URL project does not exist.
  if (unavailable || status === WorkingProjectStatusValue.ListingUnavailable) {
    return (
      <ApplicationsPage
        title={<AutoragHeader />}
        loaded
        empty={false}
        loadError={projectListLoadError}
      />
    );
  }

  let title = 'Select a project to begin';
  if (namespace) {
    title = 'Project not found';
  } else if (status === WorkingProjectStatusValue.EmptyList) {
    title = 'No projects';
  }

  return (
    <ApplicationsPage
      title={<AutoragHeader />}
      loaded={!loading}
      empty
      emptyStatePage={
        <EmptyState titleText={title} headingLevel="h2">
          <EmptyStateBody>
            {namespace
              ? `Project ${namespace} was not found. Choose a project from the project selector to continue.`
              : 'Choose a project from the project selector to continue.'}
          </EmptyStateBody>
        </EmptyState>
      }
    />
  );
};

const AutoragProjectRoute: React.FC = () => {
  const enabled = useIsAreaAvailable(SupportedArea.UNIFIED_PROJECT_SELECTOR).status;
  return enabled ? <UnifiedProjectRoute /> : <Outlet />;
};

export default AutoragProjectRoute;

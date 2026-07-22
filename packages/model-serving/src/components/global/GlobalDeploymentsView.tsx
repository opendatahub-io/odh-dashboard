import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { byName, type ProjectKind } from '@odh-dashboard/k8s-core';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { Alert, List, ListItem } from '@patternfly/react-core';
import { GlobalNoModelsView } from './GlobalNoModelsView';
import GlobalDeploymentsTable from './GlobalDeploymentsTable';
import ModelServingProjectSelection from './ModelServingProjectSelection';
import NoProjectsPage from './NoProjectsPage';
import GlobalModelsLoading from './GlobalModelsLoading';
import { deploymentsInternalPath, deploymentsLegacyPath } from './deploymentsPaths';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import { isModelServingPlatformExtension } from '../../../extension-points';
import EmptyModelServingPlatform from '../projectDetails/EmptyModelServingPlatform';

type GlobalDeploymentsViewProps = {
  projects: ProjectKind[];
  projectsLoaded: boolean;
  hidePageDescription?: boolean;
  useSubTabPaths?: boolean;
};

const GlobalDeploymentsView: React.FC<GlobalDeploymentsViewProps> = ({
  projects,
  projectsLoaded,
  hidePageDescription = false,
  useSubTabPaths = false,
}) => {
  const { preferredProject } = React.useContext(ProjectsContext);
  const navigate = useNavigate();

  const allPlatforms = useExtensions(isModelServingPlatformExtension);
  const {
    deployments,
    loaded: deploymentsLoaded,
    errors: deploymentsErrors,
  } = React.useContext(ModelDeploymentsContext);
  const hasDeployments = deployments && deployments.length > 0;
  const isLoading = !deploymentsLoaded || !projectsLoaded;
  const isEmpty =
    projects.length === 0 || (!isLoading && !hasDeployments) || allPlatforms.length === 0;

  const { projects: modelProjects } = React.useContext(ModelDeploymentsContext);
  const { namespace: modelNamespace } = useParams<{ namespace: string }>();
  const currentProject = modelProjects?.find(byName(modelNamespace));

  const hasDeploymentErrors = Boolean(deploymentsErrors && deploymentsErrors.length > 0);
  const pageDescription = hidePageDescription
    ? undefined
    : 'View and manage the health and performance of deployed models. ';

  const deploymentErrorsAlert =
    hasDeploymentErrors && deploymentsErrors ? (
      <Alert
        variant="danger"
        isInline
        title="Error encountered while loading deployments"
        isExpandable
        data-testid="error-loading-deployments"
      >
        <List>
          {deploymentsErrors.map((error) => (
            <ListItem key={error.message}>{error.message}</ListItem>
          ))}
        </List>
      </Alert>
    ) : null;

  const getDeploymentsPath = React.useCallback(
    (ns: string) => (useSubTabPaths ? deploymentsInternalPath(ns) : deploymentsLegacyPath(ns)),
    [useSubTabPaths],
  );

  return (
    <>
      {useSubTabPaths && <ModelServingProjectSelection getRedirectPath={getDeploymentsPath} />}
      {deploymentErrorsAlert}
      <ApplicationsPage
        loaded={!isLoading}
        loadingContent={
          <GlobalModelsLoading
            title="Loading"
            description="Retrieving model data from all projects in the cluster. This can take a few minutes."
            onCancel={() => {
              const redirectProject =
                preferredProject ?? (projects.length > 0 ? projects[0] : undefined);
              if (redirectProject) {
                navigate(getDeploymentsPath(redirectProject.metadata.name));
              }
            }}
          />
        }
        empty={isEmpty}
        emptyStatePage={
          projects.length === 0 ? (
            <NoProjectsPage />
          ) : allPlatforms.length === 0 ? (
            <EmptyModelServingPlatform />
          ) : (
            <GlobalNoModelsView project={currentProject ?? undefined} />
          )
        }
        description={pageDescription}
        noTitle // rendered inside a TabRoutePage which provides the title
        noHeader={useSubTabPaths}
        title={<TitleWithIcon title="Deployments" objectType={ProjectObjectType.deployedModels} />}
        headerContent={
          useSubTabPaths ? undefined : (
            <ModelServingProjectSelection getRedirectPath={getDeploymentsPath} />
          )
        }
        removeChildrenTopPadding={useSubTabPaths}
        provideChildrenPadding
      >
        <GlobalDeploymentsTable deployments={deployments ?? []} loaded />
      </ApplicationsPage>
    </>
  );
};

export default GlobalDeploymentsView;

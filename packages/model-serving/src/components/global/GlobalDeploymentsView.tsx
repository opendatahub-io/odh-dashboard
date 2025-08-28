import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useNavigate, useParams } from 'react-router-dom';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { GlobalNoModelsView } from './GlobalNoModelsView';
import GlobalDeploymentsTable from './GlobalDeploymentsTable';
import ModelServingProjectSelection from './ModelServingProjectSelection';
import NoProjectsPage from './NoProjectsPage';
import GlobalModelsLoading from './GlobalModelsLoading';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';

type GlobalDeploymentsViewProps = {
  projects: ProjectKind[];
  projectsLoaded: boolean;
};

const GlobalDeploymentsView: React.FC<GlobalDeploymentsViewProps> = ({
  projects,
  projectsLoaded,
}) => {
  const { preferredProject } = React.useContext(ProjectsContext);
  const navigate = useNavigate();

  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const hasDeployments = deployments && deployments.length > 0;
  const isLoading = !deploymentsLoaded || !projectsLoaded;
  const isEmpty = projects.length === 0 || (!isLoading && !hasDeployments);
  const { projects: modelProjects } = React.useContext(ModelDeploymentsContext);
  const { namespace: modelNamespace } = useParams<{ namespace: string }>();
  const currentProject = modelProjects?.find(byName(modelNamespace));

  return (
    <ApplicationsPage
      loaded={!isLoading}
      loadingContent={
        <GlobalModelsLoading
          title="Loading"
          description="Retrieving model data from all projects in the cluster. This can take a few minutes."
          onCancel={() => {
            const redirectProject =
              preferredProject ?? projects.length > 0 ? projects[0] : undefined;
            if (redirectProject) {
              navigate(`/modelServing/${redirectProject.metadata.name}`);
            }
          }}
        />
      }
      empty={isEmpty}
      emptyStatePage={
        projects.length === 0 ? (
          <NoProjectsPage />
        ) : (
          <GlobalNoModelsView project={currentProject ?? undefined} />
        )
      }
      description="Manage and view the health and performance of your deployed models."
      title={
        <TitleWithIcon title="Model deployments" objectType={ProjectObjectType.deployedModels} />
      }
      headerContent={
        <ModelServingProjectSelection getRedirectPath={(ns: string) => `/modelServing/${ns}`} />
      }
      provideChildrenPadding
    >
      <GlobalDeploymentsTable deployments={deployments ?? []} loaded />
    </ApplicationsPage>
  );
};

export default GlobalDeploymentsView;

import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { Bullseye, Spinner } from '@patternfly/react-core';
import ProjectSelectorNavigator from '@odh-dashboard/internal/concepts/projects/ProjectSelectorNavigator';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { GlobalNoModelsView } from './GlobalNoModelsView';
import GlobalDeploymentsTable from './GlobalDeploymentsTable';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import { isModelServingPlatformExtension } from '../../../extension-points';

const GlobalDeploymentsView: React.FC = () => {
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const [platformsLoaded] = useResolvedExtensions(isModelServingPlatformExtension);
  const { preferredProject: currentProject } = React.useContext(ProjectsContext);
  const hasDeployments = React.useMemo(() => {
    if (!deployments) {
      return false;
    }
    if (!currentProject) {
      return deployments.length > 0;
    }
    return deployments.some(
      (deployment) => deployment.model.metadata.namespace === currentProject.metadata.name,
    );
  }, [deployments, currentProject]);
  const isLoading = !deploymentsLoaded || !platformsLoaded;

  return (
    <ApplicationsPage
      loaded={!isLoading}
      empty={!hasDeployments}
      emptyStatePage={<GlobalNoModelsView project={currentProject ?? undefined} />}
      description="Manage and view the health and performance of your deployed models."
      title={
        <TitleWithIcon title="Model deployments" objectType={ProjectObjectType.deployedModels} />
      }
      headerContent={
        <ProjectSelectorNavigator
          invalidDropdownPlaceholder="All projects"
          selectAllProjects
          showTitle
          getRedirectPath={(namespace: string) => `/modelServing/${namespace}`}
        />
      }
    >
      {isLoading ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : (
        <GlobalDeploymentsTable />
      )}
    </ApplicationsPage>
  );
};

export default GlobalDeploymentsView;

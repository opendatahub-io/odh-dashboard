import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { GlobalNoModelsView } from './GlobalNoModelsView';
import GlobalDeploymentsTable from './GlobalDeploymentsTable';
import ModelServingProjectSelection from './ModelServingProjectSelection';
import NoProjectsPage from './NoProjectsPage';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';

type GlobalDeploymentsViewProps = {
  currentProject?: ProjectKind | null;
};

const GlobalDeploymentsView: React.FC<GlobalDeploymentsViewProps> = ({ currentProject }) => {
  const {
    deployments,
    loaded: deploymentsLoaded,
    projects,
  } = React.useContext(ModelDeploymentsContext);
  const hasDeployments = deployments && deployments.length > 0;
  const isLoading = !deploymentsLoaded;
  const isEmpty = projects?.length === 0 || (!isLoading && !hasDeployments);

  return (
    <ApplicationsPage
      loaded={!isLoading}
      empty={isEmpty}
      emptyStatePage={
        projects?.length === 0 ? (
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
        <ModelServingProjectSelection getRedirectPath={(ns: string) => `/model-serving/${ns}`} />
      }
    >
      <GlobalDeploymentsTable />
    </ApplicationsPage>
  );
};

export default GlobalDeploymentsView;

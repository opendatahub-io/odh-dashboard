import React from 'react';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import EmptyDeploymentsState from './EmptyDeploymentsState';
import GlobalDeploymentsTable from '../src/components/global/GlobalDeploymentsTable';
import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';

const DeploymentsTab: React.FC = () => {
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  if (deploymentsLoaded && deployments?.length === 0) {
    return (
      <EmptyDeploymentsState
        title="No deployments from model registry"
        headerIcon={() => (
          <img
            src={typedEmptyImage(ProjectObjectType.registeredModels, 'MissingDeployment')}
            alt="missing deployment"
          />
        )}
        description="No deployments initiated from model registry for this model version."
        testid="model-version-deployments-empty-state"
      />
    );
  }
  return <GlobalDeploymentsTable deployments={deployments ?? []} loaded={deploymentsLoaded} />;
};

export default DeploymentsTab;

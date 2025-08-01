import React from 'react';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import EmptyModelRegistryState from './EmptyModelRegistryState';
import GlobalDeploymentsTable from '../src/components/global/GlobalDeploymentsTable';
import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';

const DeploymentsTab: React.FC = () => {
  // Note: We don't use the props currently, but they're required by the extension interface
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  if (deploymentsLoaded && deployments?.length === 0) {
    return (
      <EmptyModelRegistryState
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

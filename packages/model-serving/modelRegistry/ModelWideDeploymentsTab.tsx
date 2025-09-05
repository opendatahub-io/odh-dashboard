import React from 'react';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { useExtensions } from '@odh-dashboard/plugin-core';
import EmptyDeploymentsState from './EmptyDeploymentsState';
import { isModelServingPlatformExtension } from '../extension-points';
import ModelRegistryDeploymentsTable from './ModelRegistryDeploymentsTable';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';

const ModelWideDeploymentsTabContent: React.FC<{ mrName?: string }> = ({ mrName }) => {
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
        description="No deployments initiated from model registry for this model."
        testid="model-deployments-empty-state"
      />
    );
  }

  return (
    <ModelRegistryDeploymentsTable
      deployments={deployments ?? []}
      loaded={deploymentsLoaded}
      mrName={mrName}
      // No mvId = model-wide deployments (shows version column)
    />
  );
};

const ModelWideDeploymentsTab: React.FC<{
  rmId?: string;
  mrName?: string;
}> = ({ rmId, mrName }) => {
  const { projects } = React.useContext(ProjectsContext);
  const modelServingPlatforms = useExtensions(isModelServingPlatformExtension);
  const labelSelectors = React.useMemo(() => {
    if (!rmId) {
      return undefined;
    }
    return {
      [KnownLabels.REGISTERED_MODEL_ID]: rmId,
    };
  }, [rmId]);

  return (
    <ModelDeploymentsProvider
      projects={projects}
      modelServingPlatforms={modelServingPlatforms}
      labelSelectors={labelSelectors}
      mrName={mrName}
    >
      <ModelWideDeploymentsTabContent mrName={mrName} />
    </ModelDeploymentsProvider>
  );
};

export default ModelWideDeploymentsTab;

import React from 'react';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { useExtensions } from '@odh-dashboard/plugin-core';
import EmptyDeploymentsState from './EmptyDeploymentsState';
import ModelRegistryDeploymentsTable from './ModelRegistryDeploymentsTable';
import { isModelServingPlatformExtension } from '../extension-points';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';

const VersionDeploymentsTabContent: React.FC = () => {
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

  return (
    <ModelRegistryDeploymentsTable
      deployments={deployments ?? []}
      loaded={deploymentsLoaded}
      mvId="version-specific" // Indicates version-specific deployments (no version column)
    />
  );
};

const VersionDeploymentsTab: React.FC<{
  rmId?: string;
  mvId?: string;
  mrName?: string;
}> = ({ rmId, mvId, mrName }) => {
  const { projects } = React.useContext(ProjectsContext);
  const modelServingPlatforms = useExtensions(isModelServingPlatformExtension);
  const labelSelectors = React.useMemo(() => {
    if (!rmId || !mvId) {
      return undefined;
    }
    return {
      [KnownLabels.REGISTERED_MODEL_ID]: rmId,
      [KnownLabels.MODEL_VERSION_ID]: mvId,
    };
  }, [rmId, mvId]);

  return (
    <ModelDeploymentsProvider
      projects={projects}
      modelServingPlatforms={modelServingPlatforms}
      labelSelectors={labelSelectors}
      mrName={mrName}
    >
      <VersionDeploymentsTabContent />
    </ModelDeploymentsProvider>
  );
};

export default VersionDeploymentsTab;

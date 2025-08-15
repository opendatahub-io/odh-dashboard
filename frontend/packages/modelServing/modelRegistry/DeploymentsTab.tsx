import React from 'react';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { useExtensions } from '@odh-dashboard/plugin-core';
import EmptyDeploymentsState from './EmptyDeploymentsState';
import { isModelServingPlatformExtension } from '../extension-points';
import GlobalDeploymentsTable from '../src/components/global/GlobalDeploymentsTable';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';

const DeploymentsTabContent: React.FC = () => {
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

const DeploymentsTab: React.FC<{ rmId?: string; mvId?: string }> = ({ rmId, mvId }) => {
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
    >
      <DeploymentsTabContent />
    </ModelDeploymentsProvider>
  );
};

export default DeploymentsTab;

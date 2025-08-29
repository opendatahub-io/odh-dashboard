import React from 'react';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { Alert } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import EmptyDeploymentsState from './EmptyDeploymentsState';
import { isModelServingPlatformExtension } from '../extension-points';
import GlobalDeploymentsTable from '../src/components/global/GlobalDeploymentsTable';
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
    <GlobalDeploymentsTable
      deployments={deployments ?? []}
      loaded={deploymentsLoaded}
      hideDeployButton
      showAlert
      showVersionColumn
      mrName={mrName}
      alertContent={
        <Alert variant="info" isInline title="Filtered list: Deployments from model registry only">
          This list includes only deployments that were initiated from the model registry. To view
          and manage all of your deployments, go to the{' '}
          <Link to="/modelServing">Model Serving</Link> page.
        </Alert>
      }
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

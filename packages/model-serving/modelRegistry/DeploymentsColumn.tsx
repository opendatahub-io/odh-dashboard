import React from 'react';
import { Link } from 'react-router-dom';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { registeredModelDeploymentsRoute } from '@odh-dashboard/internal/routes/modelRegistry/registeredModels';
import type { RegisteredModel } from '@mf/modelRegistry/compiled-types/src/app/types';
import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';

const DeploymentsColumn: React.FC<{
  registeredModel: RegisteredModel;
  preferredModelRegistryName?: string;
}> = ({ registeredModel, preferredModelRegistryName }) => {
  const { deployments, loaded } = React.useContext(ModelDeploymentsContext);

  if (!loaded) {
    return <span>-</span>;
  }

  // Count deployments for this registered model
  const modelDeployments =
    deployments?.filter(
      (deployment) =>
        deployment.model.kind === 'InferenceService' &&
        deployment.model.metadata.labels?.[KnownLabels.REGISTERED_MODEL_ID] === registeredModel.id,
    ) || [];

  const deploymentCount = modelDeployments.length;

  if (deploymentCount === 0) {
    return <span>-</span>;
  }

  return (
    <Link to={registeredModelDeploymentsRoute(registeredModel.id, preferredModelRegistryName)}>
      {deploymentCount} {deploymentCount === 1 ? 'deployment' : 'deployments'}
    </Link>
  );
};

export default DeploymentsColumn;

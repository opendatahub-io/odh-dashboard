import React from 'react';
import { Link } from 'react-router-dom';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import { useHostApi } from '@odh-dashboard/plugin-core/host-api';
import type { RegisteredModelRef } from '@odh-dashboard/model-registry/shared';
import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';

const DeploymentsColumn: React.FC<{
  registeredModel: RegisteredModelRef;
  preferredModelRegistryName?: string;
}> = ({ registeredModel, preferredModelRegistryName }) => {
  const { registeredModelDeploymentsRoute } = useHostApi();
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

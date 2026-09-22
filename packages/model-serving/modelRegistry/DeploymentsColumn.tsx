import React from 'react';
import { Link } from 'react-router-dom';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import type { RegisteredModelRef } from '../src/shared/types/deploy-prefill';
import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';

const DeploymentsColumn: React.FC<{
  registeredModel: RegisteredModelRef;
  deploymentsUrl?: string;
}> = ({ registeredModel, deploymentsUrl }) => {
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

  if (!deploymentsUrl) {
    return (
      <span>
        {deploymentCount} {deploymentCount === 1 ? 'deployment' : 'deployments'}
      </span>
    );
  }

  return (
    <Link to={deploymentsUrl}>
      {deploymentCount} {deploymentCount === 1 ? 'deployment' : 'deployments'}
    </Link>
  );
};

export default DeploymentsColumn;

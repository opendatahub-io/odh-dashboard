import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Tooltip } from '@patternfly/react-core';
import { ModelRegistriesContext } from '@odh-dashboard/internal/concepts/modelRegistry/context/ModelRegistriesContext';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import type { RegisteredModel } from '@mf/modelRegistry/compiled-types/src/app/types';

import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';

const DeploymentsColumn: React.FC<{ registeredModel: RegisteredModel }> = ({ registeredModel }) => {
  const { deployments, loaded } = React.useContext(ModelDeploymentsContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const navigate = useNavigate();

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
  const handleDeploymentsClick = () => {
    navigate(
      `/ai-hub/registry/${preferredModelRegistry?.metadata.name || ''}/registered-models/${
        registeredModel.id
      }/deployments`,
    );
  };

  return (
    <div>
      <Link
        to={`/ai-hub/registry/${preferredModelRegistry?.metadata.name || ''}/registered-models/${
          registeredModel.id
        }/deployments`}
        onClick={handleDeploymentsClick}
      >
        {deploymentCount} {deploymentCount === 1 ? 'deployment' : 'deployments'}
      </Link>
      <Tooltip content="View all deployments for this model">
        <Button
          variant="link"
          isInline
          aria-label="View deployments"
          onClick={handleDeploymentsClick}
          style={{ marginLeft: '8px', padding: '0' }}
        />
      </Tooltip>
    </div>
  );
};

export default DeploymentsColumn;

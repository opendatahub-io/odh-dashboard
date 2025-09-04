import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { SortableData } from '@odh-dashboard/internal/components/table/types';
// Define the RegisteredModel type locally since we can't import from @mf/modelRegistry
type RegisteredModel = {
  id: string;
  name: string;
  description?: string;
  customProperties?: Record<string, unknown>;
  owner?: string;
  lastUpdateTimeSinceEpoch: string;
};

type ModelRegistryTableColumn<RM extends RegisteredModel = RegisteredModel> = SortableData<RM> & {
  cellRenderer: (registeredModel: RM) => React.ReactNode;
};
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { ModelDeploymentsContext } from '../src/concepts/ModelDeploymentsContext';

const DeploymentsColumn: React.FC<{ registeredModel: RegisteredModel }> = ({ registeredModel }) => {
  const { deployments, loaded } = React.useContext(ModelDeploymentsContext);
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
    navigate(`/model-registry/${registeredModel.id}/deployments`);
  };

  return (
    <div>
      <Link
        to={`/model-registry/${registeredModel.id}/deployments`}
        onClick={handleDeploymentsClick}
        style={{ textDecoration: 'none' }}
      >
        {deploymentCount} {deploymentCount === 1 ? 'deployment' : 'deployments'}
      </Link>
      <Tooltip content="View all deployments for this model">
        <Button
          variant="link"
          icon={<ExternalLinkAltIcon />}
          aria-label="View deployments"
          onClick={handleDeploymentsClick}
          style={{ marginLeft: '8px', padding: '0' }}
        />
      </Tooltip>
    </div>
  );
};

export const createDeploymentsColumn = (): ModelRegistryTableColumn<RegisteredModel> => ({
  field: 'deployments',
  label: 'Deployments',
  sortable: false,
  info: {
    popover:
      'This is the total number of deployments that you have permission to access across all versions of the model.',
    popoverProps: {
      position: 'left',
    },
  },
  cellRenderer: (registeredModel: RegisteredModel) => (
    <DeploymentsColumn registeredModel={registeredModel} />
  ),
});

export default DeploymentsColumn;

import React from 'react';
import { Alert } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { createVersionColumn } from './utils/deploymentColumns';
import GlobalDeploymentsTable from '../src/components/global/GlobalDeploymentsTable';
import type { Deployment } from '../extension-points';

type ModelRegistryDeploymentsTableProps = {
  deployments: Deployment[];
  loaded: boolean;
  mvId?: string; // If provided, shows version-specific deployments; if not, shows model-wide deployments
  mrName?: string;
};

const ModelRegistryDeploymentsTable: React.FC<ModelRegistryDeploymentsTableProps> = ({
  deployments,
  loaded,
  mvId,
  mrName,
}) => {
  const customColumns = React.useMemo(() => {
    // Only add version column for model-wide deployments (when mvId is not provided)
    return mvId ? [] : [createVersionColumn(mrName)];
  }, [mvId, mrName]);

  const alertContent = (
    <Alert variant="info" isInline title="Filtered list: Deployments from model registry only">
      This list includes only deployments that were initiated from the model registry. To view and
      manage all of your deployments, go to the <Link to="/ai-hub/deployments">Deployments</Link>{' '}
      page.
    </Alert>
  );

  return (
    <GlobalDeploymentsTable
      deployments={deployments}
      loaded={loaded}
      hideDeployButton
      customColumns={customColumns}
      alertContent={alertContent}
    />
  );
};

export default ModelRegistryDeploymentsTable;

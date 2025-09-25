import React from 'react';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import DeploymentsTable from '../deployments/DeploymentsTable';
import {
  isModelServingDeploymentsTableExtension,
  type Deployment,
} from '../../../extension-points';
import type { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

export const ProjectDeploymentsTable: React.FC<{
  modelServingPlatform: ModelServingPlatform;
  deployments: Deployment[];
  loaded: boolean;
}> = ({ modelServingPlatform, deployments, loaded }) => {
  const [tableExtension, tableExtensionLoaded] = useResolvedPlatformExtension(
    isModelServingDeploymentsTableExtension,
    modelServingPlatform,
  );

  return (
    <DeploymentsTable
      data-testid="kserve-inference-service-table" // legacy testid
      deployments={deployments}
      loaded={loaded && tableExtensionLoaded}
      showExpandedInfo
      platformColumns={tableExtension?.properties.columns()}
    />
  );
};

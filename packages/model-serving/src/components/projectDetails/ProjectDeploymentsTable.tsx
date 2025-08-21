import React from 'react';
import { usePlatformExtension, useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import DeploymentsTable from '../deployments/DeploymentsTable';
import {
  isModelServingDeploymentsExpandedInfo,
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
  const expandedInfoExtension = usePlatformExtension(
    isModelServingDeploymentsExpandedInfo,
    modelServingPlatform,
  );

  return (
    <DeploymentsTable
      data-testid="kserve-inference-service-table" // legacy testid
      deployments={deployments}
      loaded={loaded && tableExtensionLoaded}
      showExpandedInfo={!!expandedInfoExtension}
      platformColumns={tableExtension?.properties.columns()}
    />
  );
};

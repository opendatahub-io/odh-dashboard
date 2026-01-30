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
      deployments={deployments}
      loaded={loaded && tableExtensionLoaded}
      showExpandedToggleColumn
      platformColumns={tableExtension?.properties.columns()}
    />
  );
};

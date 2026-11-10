import React from 'react';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isModelServingDeploymentsBanner } from '../../../extension-points';

/**
 * Renders registered `model-serving.deployments/banner` extensions above a deployments table.
 */
const DeploymentsBannerSlot: React.FC = () => {
  const bannerExtensions = useExtensions(isModelServingDeploymentsBanner);

  if (bannerExtensions.length === 0) {
    return null;
  }

  return (
    <>
      {bannerExtensions.map((extension) => (
        <LazyCodeRefComponent
          key={extension.properties.id}
          component={extension.properties.component}
        />
      ))}
    </>
  );
};

export default DeploymentsBannerSlot;

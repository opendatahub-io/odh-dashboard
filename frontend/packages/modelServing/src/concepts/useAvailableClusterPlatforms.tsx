import React from 'react';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { IntegrationsStatusContext } from '@odh-dashboard/internal/concepts/integrations/IntegrationsStatusContext';
import { isEnabled } from '@odh-dashboard/internal/concepts/integrations/useIsComponentIntegrationEnabled';
import type { IntegrationAppStatus } from '@odh-dashboard/internal/types';
import type { ModelServingPlatform } from './useProjectServingPlatform';
import { isModelServingPlatformExtension } from '../../extension-points';

// If a platform has an integration app name, we need to check if it is available on the cluster
const isPlatformAvailable = (
  platform: ModelServingPlatform,
  integrationStatus: Record<string, IntegrationAppStatus>,
): boolean => {
  if (platform.properties.manage.clusterRequirements?.integrationAppName) {
    return isEnabled(
      integrationStatus,
      platform.properties.manage.clusterRequirements.integrationAppName,
    );
  }
  return true;
};

type ClusterPlatformsType = {
  clusterPlatforms: ModelServingPlatform[];
  clusterPlatformsLoaded: boolean;
  clusterPlatformsError?: Error;
};

/**
 * @returns The list of platforms that are available for selection on the cluster. (Different than the list of all platform plugins)
 */
export const useAvailableClusterPlatforms = (): ClusterPlatformsType => {
  const allPlatforms = useExtensions<ModelServingPlatform>(isModelServingPlatformExtension);

  const { integrationStatus, loaded, error } = React.useContext(IntegrationsStatusContext);

  const platforms = React.useMemo(() => {
    const availablePlatforms = [];
    for (const p of allPlatforms) {
      if (isPlatformAvailable(p, integrationStatus)) {
        availablePlatforms.push(p);
      }
    }
    return availablePlatforms;
  }, [allPlatforms, integrationStatus]);

  const value = React.useMemo(
    () => ({
      clusterPlatforms: platforms,
      clusterPlatformsLoaded: loaded,
      clusterPlatformsError: error,
    }),
    [platforms, loaded, error],
  );

  return value;
};

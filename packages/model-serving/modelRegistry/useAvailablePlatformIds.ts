import React from 'react';
import { useAvailableClusterPlatforms } from '../src/concepts/useAvailableClusterPlatforms';
import { useModelServingDeployMethods } from '../src/concepts/useModelServingDeployMethods';

/**
 * Returns the available cluster platform IDs when a deployment method is available.
 */
const useAvailablePlatformIds = (): string[] => {
  const { clusterPlatforms } = useAvailableClusterPlatforms();
  const { hasDeployMethods } = useModelServingDeployMethods();

  return React.useMemo(
    () => (hasDeployMethods ? clusterPlatforms.map((p) => p.properties.id) : []),
    [clusterPlatforms, hasDeployMethods],
  );
};

export default useAvailablePlatformIds;

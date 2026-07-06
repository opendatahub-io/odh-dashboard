import React from 'react';
import { useAvailableClusterPlatforms } from '../src/concepts/useAvailableClusterPlatforms';

/**
 * Returns the available cluster platforms.
 */
const useAvailablePlatformIds = (): string[] => {
  const { clusterPlatforms } = useAvailableClusterPlatforms();

  return React.useMemo(() => clusterPlatforms.map((p) => p.properties.id), [clusterPlatforms]);
};

export default useAvailablePlatformIds;

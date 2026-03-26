import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';

export type GenAiStudioConfig = {
  aiAssetCustomEndpoints?: {
    externalProviders?: boolean;
    clusterDomains?: string[];
  };
};

/**
 * Hook to access genAiStudioConfig from the dashboard configuration.
 */
const useGenAiDashboardConfig = (): GenAiStudioConfig | undefined => {
  const config = React.useContext(DashboardConfigContext);
  return config?.genAiStudioConfig;
};

export default useGenAiDashboardConfig;

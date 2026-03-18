import React from 'react';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  isDashboardConfigExtension,
  DashboardConfigData,
} from '@odh-dashboard/plugin-core/extension-points';

/**
 * Hook to access genAiStudioConfig from the dashboard configuration.
 */
const useGenAiDashboardConfig = (): DashboardConfigData['genAiStudioConfig'] => {
  const configExtensions = useExtensions(isDashboardConfigExtension);

  return React.useMemo(() => {
    if (configExtensions.length === 0) {
      return undefined;
    }
    return configExtensions[0].properties.config.genAiStudioConfig;
  }, [configExtensions]);
};

export default useGenAiDashboardConfig;

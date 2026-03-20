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
    const configExtension = configExtensions.find(
      (ext) => ext.properties.id === 'dashboard-config',
    );

    if (!configExtension) {
      return undefined;
    }

    // Extract genAiStudioConfig from the full dashboard config spec
    return configExtension.properties.config.genAiStudioConfig;
  }, [configExtensions]);
};

export default useGenAiDashboardConfig;

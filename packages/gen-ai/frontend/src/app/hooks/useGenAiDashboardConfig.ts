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
  const allExtensions = useExtensions(isDashboardConfigExtension);

  return React.useMemo(() => {
    // Filter by type guard first, then find by ID
    const dashboardConfigExtensions = allExtensions.filter(isDashboardConfigExtension);
    const configExtension = dashboardConfigExtensions.find(
      (ext) => ext.properties.id === 'dashboard-config',
    );

    if (!configExtension) {
      return undefined;
    }

    // Extract genAiStudioConfig from the full dashboard config spec
    return configExtension.properties.config.genAiStudioConfig;
  }, [allExtensions]);
};

export default useGenAiDashboardConfig;

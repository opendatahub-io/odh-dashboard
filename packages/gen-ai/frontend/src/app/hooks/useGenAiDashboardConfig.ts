import { getDashboardConfig } from '@odh-dashboard/plugin-core';

/**
 * Hook to access genAiStudioConfig from the dashboard configuration.
 */
const useGenAiDashboardConfig = (): unknown => {
  const config = getDashboardConfig();
  return config?.genAiStudioConfig;
};

export default useGenAiDashboardConfig;

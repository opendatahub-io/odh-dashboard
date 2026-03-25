import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';

/**
 * Hook to access genAiStudioConfig from the dashboard configuration.
 */
const useGenAiDashboardConfig = (): unknown => {
  const config = React.useContext(DashboardConfigContext);
  return config?.genAiStudioConfig;
};

export default useGenAiDashboardConfig;

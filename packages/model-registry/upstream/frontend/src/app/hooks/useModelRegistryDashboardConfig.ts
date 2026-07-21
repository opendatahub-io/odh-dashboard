import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';

type ModelRegistryDashboardConfig = {
  toolCalling: boolean;
};

const useModelRegistryDashboardConfig = (): ModelRegistryDashboardConfig => {
  const config = React.useContext(DashboardConfigContext);
  return {
    toolCalling: config === null ? true : (config.dashboardConfig.toolCalling ?? false),
  };
};

export default useModelRegistryDashboardConfig;

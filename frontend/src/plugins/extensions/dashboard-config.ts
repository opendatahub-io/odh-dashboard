import type { DashboardConfigExtension } from '@odh-dashboard/plugin-core/extension-points';

const dashboardConfigExtensions: DashboardConfigExtension[] = [
  {
    type: 'app.config/dashboard',
    properties: {
      id: 'dashboard-config',
      // Config will be dynamically populated by DashboardConfigProvider with the entire dashboardConfig.spec
      config: {},
    },
  },
];

export default dashboardConfigExtensions;

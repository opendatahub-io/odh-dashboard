import type { DashboardConfigExtension } from '@odh-dashboard/plugin-core/extension-points';

const dashboardConfigExtensions: DashboardConfigExtension[] = [
  {
    type: 'app.config/dashboard',
    properties: {
      id: 'genai-config',
      // Config will be dynamically populated by DashboardConfigProvider
      config: {},
    },
  },
];

export default dashboardConfigExtensions;

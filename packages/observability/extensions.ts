import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const ADMIN_USER = 'ADMIN_USER';
const PLUGIN_OBSERVABILITY = 'plugin-observability';
const BLOCKING_CONDITION_TYPES = ['MonitoringReady', 'PersesAvailable'];

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_OBSERVABILITY,
      featureFlags: ['observabilityDashboard'],
      customCondition: ({ dsciStatus }) =>
        (
          dsciStatus?.conditions.filter((c) => BLOCKING_CONDITION_TYPES.includes(c.type)) ?? []
        ).every((c) => c.status === 'True'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_OBSERVABILITY, ADMIN_USER],
    },
    properties: {
      id: 'observability-dashboard',
      title: 'Dashboard',
      href: '/observe-and-monitor/dashboard',
      path: '/observe-and-monitor/dashboard/*',
      group: '1_top',
      section: 'observe-and-monitor',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/observe-and-monitor/dashboard/*',
      component: () => import('./src/pages/DashboardPage'),
    },
    flags: {
      required: [PLUGIN_OBSERVABILITY, ADMIN_USER],
    },
  },
];

export default extensions;

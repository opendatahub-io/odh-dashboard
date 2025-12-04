import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_OBSERVABILITY = 'plugin-observability';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_OBSERVABILITY,
      devFlags: ['Observability'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_OBSERVABILITY],
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
      required: [PLUGIN_OBSERVABILITY],
    },
  },
];

export default extensions;

import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line no-restricted-syntax -- shared runtime area extension used by static and host entries
import observabilityArea, { PLUGIN_OBSERVABILITY } from './extensions/area';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  observabilityArea,
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

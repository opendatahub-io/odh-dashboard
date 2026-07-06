import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';

const PLUGIN_GPUAAS = 'plugin-gpuaas';
const ADMIN_USER = 'ADMIN_USER';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_GPUAAS,
      reliantAreas: [SupportedArea.GPUAAS_INFRASTRUCTURE],
      featureFlags: ['gpuaas'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_GPUAAS, ADMIN_USER],
    },
    properties: {
      id: 'gpuaas-infrastructure',
      title: 'Infrastructure',
      href: '/observe-and-monitor/infrastructure',
      path: '/observe-and-monitor/infrastructure/*',
      section: 'observe-and-monitor',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/observe-and-monitor/infrastructure/*',
      component: () => import('./src/InfrastructureRoutes'),
    },
    flags: {
      required: [PLUGIN_GPUAAS, ADMIN_USER],
    },
  },
];

export default extensions;

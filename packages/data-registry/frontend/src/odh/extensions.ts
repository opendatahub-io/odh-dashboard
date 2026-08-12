import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_DATA_REGISTRY = 'plugin-data-registry';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_DATA_REGISTRY,
      featureFlags: ['dataRegistry'],
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [PLUGIN_DATA_REGISTRY],
    },
    properties: {
      id: 'data-registry',
      title: 'Data Registry',
      group: '7_data_registry_studio',
      iconRef: () => import('./DataRegistryNavIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_DATA_REGISTRY],
    },
    properties: {
      id: 'data-registry-view',
      title: 'Data Registry',
      href: '/data-registry/main-view',
      section: 'data-registry',
      path: '/data-registry/main-view/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_DATA_REGISTRY],
    },
    properties: {
      path: '/data-registry/main-view/*',
      component: () => import('./DataRegistryWrapper'),
    },
  },
];

export default extensions;

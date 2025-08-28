import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const reliantAreas = ['model-registry'];
const PLUGIN_MODEL_REGISTRY = 'model-registry-plugin';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MODEL_REGISTRY,
      reliantAreas,
      devFlags: ['Model Registry Plugin'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_REGISTRY],
    },
    properties: {
      id: 'modelRegistry-kf',
      title: 'Model registry (KF)',
      href: '/model-registry',
      section: 'models',
      path: '/model-registry/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_REGISTRY],
    },
    properties: {
      id: 'settings-model-registry',
      title: 'Model registry settings (KF)',
      href: '/model-registry-settings',
      section: 'settings',
      path: '/model-registry-settings/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_MODEL_REGISTRY],
    },
    properties: {
      path: '/model-registry/*',
      component: () => import('./ModelRegistryWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_MODEL_REGISTRY],
    },
    properties: {
      path: '/model-registry-settings/*',
      component: () => import('./ModelRegistrySettingsRoutesWrapper'),
    },
  },
];

export default extensions;

import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { StackComponent, SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

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
      required: [SupportedArea.MODEL_REGISTRY],
    },
    featureFlags: ['disableModelRegistry'],
    requiredComponents: [StackComponent.MODEL_REGISTRY],
    properties: {
      id: 'modelRegistry',
      title: 'Model registry',
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
      id: 'modelCatalog-kf',
      title: 'Model catalog (KF)',
      href: '/model-catalog',
      section: 'models',
      path: '/model-catalog/*',
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
      required: [SupportedArea.MODEL_REGISTRY],
    },
    featureFlags: ['disableModelRegistry'],
    requiredComponents: [StackComponent.MODEL_REGISTRY],
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
      path: '/model-catalog/*',
      component: () => import('./ModelCatalogWrapper'),
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

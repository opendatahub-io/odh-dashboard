import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const reliantAreas = ['model-registry'];
const PLUGIN_MODEL_REGISTRY = 'model-registry-plugin';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/internal/utilities/v2Redirect').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MODEL_REGISTRY,
      reliantAreas,
      devFlags: ['Model Registry Plugin (unreleased pages)'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_CATALOG],
    },
    properties: {
      id: 'modelCatalog',
      title: 'Catalog',
      href: '/ai-hub/catalog',
      section: 'ai-hub',
      path: '/ai-hub/catalog/*',
      group: '1_aihub',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY],
    },
    properties: {
      id: 'modelRegistry',
      title: 'Registry',
      href: '/ai-hub/registry',
      section: 'ai-hub',
      path: '/ai-hub/registry/*',
      group: '1_aihub',
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
      href: '/ai-hub/registry',
      section: 'ai-hub',
      path: '/ai-hub/registry/*',
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
      href: '/settings/model-resources-operations/model-registry',
      section: 'settings-model-resources-and-operations',
      path: '/settings/model-resources-operations/model-registry/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY],
    },
    properties: {
      path: '/ai-hub/registry/*',
      component: () => import('./ModelRegistryWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY],
    },
    properties: {
      path: '/model-registry/*',
      component: createRedirectComponent({ from: '/model-registry/*', to: '/ai-hub/registry/*' }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MODEL_CATALOG],
    },
    properties: {
      path: '/ai-hub/catalog/*',
      component: () => import('./ModelCatalogWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MODEL_CATALOG],
    },
    properties: {
      path: '/model-catalog/*',
      component: createRedirectComponent({ from: '/model-catalog/*', to: '/ai-hub/catalog/*' }),
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

import type {
  HrefNavItemExtension,
  ProjectDetailsTab,
  AreaExtension,
  RouteExtension,
  OverviewSectionExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { ModelRegistryDeploymentsTabExtension } from '@odh-dashboard/model-registry/extension-points';

const PLUGIN_MODEL_SERVING = 'plugin-model-serving';

const extensions: (
  | AreaExtension
  | ProjectDetailsTab
  | HrefNavItemExtension
  | RouteExtension
  | OverviewSectionExtension
  | ModelRegistryDeploymentsTabExtension
)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MODEL_SERVING,
      reliantAreas: [SupportedArea.MODEL_SERVING],
      devFlags: ['Model Serving Plugin'],
    },
  },
  {
    type: 'app.project-details/tab',
    properties: {
      id: 'model-server', // same value as ProjectSectionID.MODEL_SERVER
      title: 'Models',
      component: () => import('./src/ModelsProjectDetailsTab'),
    },
    flags: {
      required: [PLUGIN_MODEL_SERVING],
    },
  },
  {
    type: 'model-registry.version-details/tab',
    properties: {
      id: 'deployments',
      title: 'Deployments',
      component: () => import('./src/components/deployments/ModelVersionRegisteredDeploymentsView'),
    },
  },
  {
    type: 'app.project-details/overview-section',
    properties: {
      id: 'model-server',
      title: 'Serve Models',
      component: () => import('./src/ServeModelsSection'),
    },
    flags: {
      required: [PLUGIN_MODEL_SERVING],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_SERVING],
    },
    properties: {
      id: 'modelServing',
      title: 'Model deployments',
      href: '/model-serving',
      section: 'models',
      path: '/model-serving/:namespace?/*',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/model-serving/:namespace?/*',
      component: () => import('./src/GlobalModelsPage'),
    },
    flags: {
      required: [PLUGIN_MODEL_SERVING],
    },
  },
];

export default extensions;

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

const PLUGIN_MODEL_SERVING = 'plugin-model-serving';

const extensions: (
  | AreaExtension
  | ProjectDetailsTab
  | HrefNavItemExtension
  | RouteExtension
  | OverviewSectionExtension
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
      component: () => import('../src/ModelsProjectDetailsTab'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'app.project-details/overview-section',
    properties: {
      id: 'model-server',
      title: 'Serve Models',
      component: () => import('../src/ServeModelsSection'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
    properties: {
      id: 'modelServing',
      title: 'Model deployments',
      href: '/modelServing',
      section: 'models',
      path: '/modelServing/:namespace?/*',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelServing/:namespace?/*',
      component: () => import('../src/GlobalModelsRoutes'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;

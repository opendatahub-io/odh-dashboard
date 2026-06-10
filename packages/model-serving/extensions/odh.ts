import type {
  AreaExtension,
  OverviewSectionExtension,
  ProjectDetailsTab,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/internal/utilities/v2Redirect').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

const extensions: (
  | AreaExtension
  | ProjectDetailsTab
  | RouteExtension
  | OverviewSectionExtension
  | TabRouteTabExtension
)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.MODEL_SERVING,
      featureFlags: ['disableModelServing'],
    },
  },
  {
    type: 'app.project-details/tab',
    properties: {
      id: 'model-server', // same value as ProjectSectionID.MODEL_SERVER
      title: 'Deployments',
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
  // Deployments tab in the Models tabbed page
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
    properties: {
      pageId: 'models-tab-page',
      id: 'deployments',
      title: 'Deployments',
      component: () => import('../src/GlobalModelsRoutes'),
      group: '3_deployments',
    },
  },
  // Deployment wizard route (still needs its own route)
  {
    type: 'app.route',
    properties: {
      path: '/ai-hub/models/deployments/deploy',
      component: () => import('../src/ModelDeploymentWizardRoutes'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  // Redirects from old URLs
  {
    type: 'app.route',
    properties: {
      path: '/ai-hub/deployments/:namespace?/*',
      component: createRedirectComponent({
        from: '/ai-hub/deployments/:namespace?/*',
        to: '/ai-hub/models/deployments/:namespace?/*',
      }),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelServing/:namespace?/*',
      component: createRedirectComponent({
        from: '/modelServing/:namespace?/*',
        to: '/ai-hub/models/deployments/:namespace?/*',
      }),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;

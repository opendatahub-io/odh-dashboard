import type {
  AreaExtension,
  HrefNavItemExtension,
  OverviewSectionExtension,
  ProjectDetailsTab,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { StackComponent, SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_MODEL_SERVING = SupportedArea.K_SERVE;

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/internal/utilities/v2Redirect').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

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
      featureFlags: ['disableKServe'],
      requiredComponents: [StackComponent.K_SERVE],
      reliantAreas: [SupportedArea.MODEL_SERVING],
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
      required: [PLUGIN_MODEL_SERVING],
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
      title: 'Deployments',
      section: 'ai-hub',
      href: '/ai-hub/deployments',
      path: '/ai-hub/deployments/:namespace?/*',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/ai-hub/deployments/:namespace?/*',
      component: () => import('../src/GlobalModelsRoutes'),
    },
    flags: {
      required: [PLUGIN_MODEL_SERVING],
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelServing/:namespace?/*',
      component: createRedirectComponent({
        from: '/modelServing/:namespace?/*',
        to: '/ai-hub/deployments/:namespace?/*',
      }),
    },
    flags: {
      required: [PLUGIN_MODEL_SERVING],
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/projects/:namespace/deploy/*',
      component: () => import('../src/ModelDeploymentWizardRoutes'),
    },
    flags: {
      required: [PLUGIN_MODEL_SERVING, SupportedArea.DEPLOYMENT_WIZARD],
    },
  },
];

export default extensions;

import type {
  AreaExtension,
  OverviewSectionExtension,
  ProjectDetailsTab,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { WizardFieldExtension } from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import type { DeploymentMethodSelectFieldType } from '../src/components/deploymentWizard/fields/DeploymentMethodSelectField';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/internal/utilities/v2Redirect').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

const deploymentMethodFieldExtension: WizardFieldExtension<DeploymentMethodSelectFieldType> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    field: () =>
      import('../src/components/deploymentWizard/fields/DeploymentMethodSelectField').then(
        (m) => m.DeploymentMethodSelectFieldWizardField,
      ),
  },
  flags: {
    required: [SupportedArea.MODEL_SERVING],
  },
};

const extensions: (
  | AreaExtension
  | ProjectDetailsTab
  | RouteExtension
  | OverviewSectionExtension
  | TabRouteTabExtension
  | WizardFieldExtension<DeploymentMethodSelectFieldType>
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
  deploymentMethodFieldExtension,
];

export default extensions;

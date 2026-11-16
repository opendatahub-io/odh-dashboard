import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { WizardFieldExtension } from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import type { DeploymentMethodSelectFieldType } from '../src/components/deploymentWizard/fields/DeploymentMethodSelectField';

const BIDIRECTIONAL_YAML_WIZARD_GA = 'bidirectionalYamlWizardGa';

export const deploymentMethodFieldExtension: WizardFieldExtension<DeploymentMethodSelectFieldType> =
  {
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

export const modelServingAreas: AreaExtension[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.MODEL_SERVING,
      featureFlags: ['disableModelServing'],
    },
  },
  {
    type: 'app.area',
    properties: {
      id: BIDIRECTIONAL_YAML_WIZARD_GA,
      devFlags: [BIDIRECTIONAL_YAML_WIZARD_GA],
    },
  },
];

export const deploymentRoutes: (TabRouteTabExtension | RouteExtension)[] = [
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
      singleTabTitle: 'Model deployments',
      component: () => import('../src/GlobalModelsRoutes'),
      group: '3_deployments',
    },
  },
  // Deployment wizard route (still needs its own route)
  {
    type: 'app.route',
    properties: {
      path: '/ai-hub/models/deployments/deploy/*',
      component: () => import('../src/ModelDeploymentWizardRoutes'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

const extensions: (
  | AreaExtension
  | TabRouteTabExtension
  | RouteExtension
  | WizardFieldExtension<DeploymentMethodSelectFieldType>
)[] = [...modelServingAreas, ...deploymentRoutes, deploymentMethodFieldExtension];

export default extensions;

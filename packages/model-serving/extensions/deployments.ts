import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/k8s-core';
// eslint-disable-next-line no-restricted-syntax
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { WizardFieldExtension } from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import type { ModelServingPlatformExtension } from '../extension-points';
import type { DeploymentMethodSelectFieldType } from '../src/components/deploymentWizard/fields/DeploymentMethodSelectField';

const SINGLE_MODEL_PLATFORM_ID = 'kserve';
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

export const singleModelPlatformExtension: ModelServingPlatformExtension = {
  type: 'model-serving.platform',
  properties: {
    id: SINGLE_MODEL_PLATFORM_ID,
    manage: {
      namespaceApplicationCase: NamespaceApplicationCase.KSERVE_PROMOTION,
      priority: 0,
      default: true,
      projectRequirements: {
        labels: {
          'modelmesh-enabled': 'false',
        },
      },
    },
    enableCardText: {
      title: 'Enable model serving',
      description:
        'Enable users to serve models using the single-model serving platform which deploys each model on its own dedicated model server. ',
      selectText: 'Select single-model',
      enabledText: 'Single-model serving enabled',
      objectType: ProjectObjectType.singleModel,
    },
    deployedModelsView: {
      startHintTitle: 'Start by deploying a model',
      startHintDescription: 'Each model is deployed on its own model server',
      deployButtonText: 'Deploy model',
    },
  },
  flags: {
    required: [SupportedArea.MODEL_SERVING],
  },
};

const extensions: (
  | AreaExtension
  | TabRouteTabExtension
  | RouteExtension
  | WizardFieldExtension<DeploymentMethodSelectFieldType>
  | ModelServingPlatformExtension
)[] = [
  ...modelServingAreas,
  ...deploymentRoutes,
  singleModelPlatformExtension,
  deploymentMethodFieldExtension,
];

export default extensions;

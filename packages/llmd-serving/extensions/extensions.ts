import type {
  DeployedModelServingDetails,
  DeploymentWizardFieldExtension,
  ModelServingDeploy,
  ModelServingDeploymentFormDataExtension,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingDeleteModal,
  ModelServingDeploymentTransformExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { LLMdDeployment } from '../src/types';

export const LLMD_SERVING_ID = 'llmd-serving';

const extensions: (
  | ModelServingPlatformWatchDeploymentsExtension<LLMdDeployment>
  | DeployedModelServingDetails<LLMdDeployment>
  | ModelServingDeploymentFormDataExtension<LLMdDeployment>
  | ModelServingDeleteModal<LLMdDeployment>
  | ModelServingDeploy<LLMdDeployment>
  | DeploymentWizardFieldExtension<LLMdDeployment>
  | ModelServingDeploymentTransformExtension<LLMdDeployment>
)[] = [
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: LLMD_SERVING_ID,
      watch: () =>
        import('../src/deployments/useWatchDeployments').then((m) => m.useWatchDeployments),
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: LLMD_SERVING_ID,
      ServingDetailsComponent: () => import('../src/components/servingRuntime'),
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: LLMD_SERVING_ID,
      extractHardwareProfileConfig: () =>
        import('../src/deployments/hardware').then((m) => m.extractHardwareProfileConfig),
      extractModelFormat: () =>
        import('../src/deployments/model').then((m) => m.extractModelFormat),
      extractReplicas: () => import('../src/deployments/hardware').then((m) => m.extractReplicas),
      extractRuntimeArgs: () =>
        import('../src/deployments/model').then((m) => m.extractRuntimeArgs),
      extractEnvironmentVariables: () =>
        import('../src/deployments/model').then((m) => m.extractEnvironmentVariables),
      extractModelAvailabilityData: () =>
        import('../src/wizardFields/modelAvailability').then((m) => m.extractModelAvailabilityData),
      extractModelLocationData: () =>
        import('../src/deployments/model').then((m) => m.extractModelLocationData),
      extractModelServerTemplate: () =>
        import('../src/deployments/server').then((m) => m.extractModelServerTemplate),
      hardwareProfilePaths: () =>
        import('../src/deployments/hardware').then(
          (m) => m.LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
        ),
    },
  },
  {
    type: 'model-serving.platform/delete-deployment',
    properties: {
      platform: LLMD_SERVING_ID,
      onDelete: () => import('../src/api/LLMdDeployment').then((m) => m.deleteDeployment),
      title: 'Delete model deployment?',
      submitButtonLabel: 'Delete model deployment',
    },
  },
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: LLMD_SERVING_ID,
      priority: 100,
      supportsOverwrite: true,
      isActive: () => import('../src/deployments/deployUtils').then((m) => m.isLLMdDeployActive),
      deploy: () => import('../src/deployments/deploy').then((m) => m.deployLLMdDeployment),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () => import('../src/wizardFields/modelServerField').then((m) => m.modelServerField),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/modelAvailability').then((m) => m.modelAvailabilityField),
    },
    flags: {
      required: ['model-as-service'],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.externalRouteField),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.tokenAuthField),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field',
    properties: {
      platform: LLMD_SERVING_ID,
      field: () =>
        import('../src/wizardFields/advancedOptionsFields').then((m) => m.deploymentStrategyField),
    },
  },
];

export default extensions;

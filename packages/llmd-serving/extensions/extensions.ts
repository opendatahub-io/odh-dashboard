import type {
  DeployedModelServingDetails,
  ModelServingDeploymentFormDataExtension,
  ModelServingPlatformWatchDeploymentsExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { LLMdDeployment } from '../src/types';

export const LLMD_SERVING_ID = 'llmd-serving';

const extensions: (
  | ModelServingPlatformWatchDeploymentsExtension<LLMdDeployment>
  | DeployedModelServingDetails<LLMdDeployment>
  | ModelServingDeploymentFormDataExtension<LLMdDeployment>
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
    },
  },
];

export default extensions;

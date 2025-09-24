import type {
  DeployedModelServingDetails,
  ModelServingPlatformWatchDeploymentsExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { LLMdDeployment } from '../src/types';

export const LLMD_SERVING_ID = 'llmd-serving';

const extensions: (
  | ModelServingPlatformWatchDeploymentsExtension<LLMdDeployment>
  | DeployedModelServingDetails<LLMdDeployment>
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
];

export default extensions;

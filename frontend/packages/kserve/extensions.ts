// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type {
  ModelServingPlatformExtension,
  ModelServingDeploymentsTableExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { KServeDeployment } from './src/deployments';

export const KSERVE_ID = 'kserve';

const extensions: (
  | ModelServingPlatformExtension<KServeDeployment>
  | ModelServingDeploymentsTableExtension<KServeDeployment>
)[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: KSERVE_ID,
      manage: {
        namespaceApplicationCase: NamespaceApplicationCase.KSERVE_PROMOTION,
        enabledLabel: 'modelmesh-enabled',
        enabledLabelValue: 'false',
      },
      deployments: {
        watch: () => import('./src/deployments').then((m) => m.useWatchDeployments),
      },
      enableCardText: {
        title: 'Single-model serving platform',
        description:
          'Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM).',
        selectText: 'Select single-model',
        enabledText: 'Single-model serving enabled',
      },
      deployedModelsView: {
        startHintTitle: 'Start by deploying a model',
        startHintDescription: 'Each model is deployed on its own model server',
        deployButtonText: 'Deploy model',
      },
    },
  },
  {
    type: 'model-serving.deployments-table',
    properties: {
      platform: KSERVE_ID,
      columns: () => import('./src/deploymentsTable').then((m) => m.columns),
    },
  },
];

export default extensions;

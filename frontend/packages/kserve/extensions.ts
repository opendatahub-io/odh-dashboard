// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/consistent-type-imports
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import type {
  ModelServingPlatformExtension,
  ModelServingDeploymentsTableExtension,
  ModelServingDeleteModal,
  ModelServingPlatformWatchDeploymentsExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { KServeDeployment } from './src/deployments';

export const KSERVE_ID = 'kserve';

const extensions: (
  | ModelServingPlatformExtension<KServeDeployment>
  | ModelServingPlatformWatchDeploymentsExtension<KServeDeployment>
  | ModelServingDeploymentsTableExtension<KServeDeployment>
  | ModelServingDeleteModal<KServeDeployment>
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
      enableCardText: {
        title: 'Single-model serving platform',
        description:
          'Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM).',
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
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: KSERVE_ID,
      watch: () => import('./src/deployments').then((m) => m.useWatchDeployments),
    },
  },
  {
    type: 'model-serving.deployments-table',
    properties: {
      platform: KSERVE_ID,
      columns: () => import('./src/deploymentsTable').then((m) => m.columns),
    },
  },
  {
    type: 'model-serving.platform/delete-modal',
    properties: {
      platform: KSERVE_ID,
      onDelete: () => import('./src/deployments').then((m) => m.deleteDeployment),
      title: 'Delete deployed model?',
      submitButtonLabel: 'Delete deployed model',
    },
  },
];

export default extensions;

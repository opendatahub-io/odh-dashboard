// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
// eslint-disable-next-line no-restricted-syntax
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type {
  ModelServingPlatformExtension,
  ModelServingPlatformWatchDeploymentsExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { NIMDeployment } from './src/deployments';

export const NIM_ID = 'nvidia-nim';

const extensions: (
  | ModelServingPlatformExtension<NIMDeployment>
  | ModelServingPlatformWatchDeploymentsExtension<NIMDeployment>
)[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: NIM_ID,
      manage: {
        namespaceApplicationCase: NamespaceApplicationCase.KSERVE_NIM_PROMOTION,
        priority: 100,
        projectRequirements: {
          annotations: {
            'opendatahub.io/nim-support': 'true',
          },
        },
        clusterRequirements: {
          integrationAppName: 'nvidia-nim',
        },
      },
      enableCardText: {
        title: 'NVIDIA NIM model serving platform',
        description:
          'Models are deployed using NVIDIA NIM microservices. Choose this option when you want to deploy your model within a NIM container. Please provide the API key to authenticate with the NIM service.',
        selectText: 'Select NVIDIA NIM',
        enabledText: 'NVIDIA NIM serving enabled',
        objectType: ProjectObjectType.modelServer,
      },
      deployedModelsView: {
        startHintTitle: 'Start by deploying a model',
        startHintDescription:
          'Deploy models using NVIDIA NIM microservices. Each model runs in its own optimized NIM container with GPU acceleration.',
        deployButtonText: 'Deploy model',
      },
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: NIM_ID,
      watch: () => import('./src/deployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
    },
  },
];

export default extensions;

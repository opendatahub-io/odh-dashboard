// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/consistent-type-imports
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import type {
  ModelServingPlatformExtension,
  ModelServingDeleteModal,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingDeploymentsExpandedInfo,
  ModelServingMetricsExtension,
  ModelServingDeploymentResourcesExtension,
  ModelServingAuthExtension,
  DeployedModelServingDetails,
  ModelServingStartStopAction,
  ModelServingPlatformFetchDeploymentStatus,
} from '@odh-dashboard/model-serving/extension-points';
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/index';
import type { KServeDeployment } from './src/deployments';

export const KSERVE_ID = 'kserve';

const extensions: (
  | ModelServingPlatformExtension<KServeDeployment>
  | ModelServingPlatformWatchDeploymentsExtension<KServeDeployment>
  | ModelServingDeploymentResourcesExtension<KServeDeployment>
  | ModelServingAuthExtension<KServeDeployment>
  | ModelServingDeploymentsExpandedInfo<KServeDeployment>
  | ModelServingDeleteModal<KServeDeployment>
  | ModelServingMetricsExtension<KServeDeployment>
  | DeployedModelServingDetails<KServeDeployment>
  | ModelServingStartStopAction<KServeDeployment>
  | ModelServingPlatformFetchDeploymentStatus<KServeDeployment>
)[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: KSERVE_ID,
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
    flags: {
      required: [SupportedArea.K_SERVE],
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
    type: 'model-serving.deployment/resources',
    properties: {
      platform: KSERVE_ID,
      useResources: () => import('./src/useKServeResources').then((m) => m.useKServeResources),
    },
  },
  {
    type: 'model-serving.auth',
    properties: {
      platform: KSERVE_ID,
      usePlatformAuthEnabled: () =>
        import('./src/useAuth').then((m) => m.useKServePlatformAuthEnabled),
    },
  },
  {
    type: 'model-serving.deployments-table/expanded-info',
    properties: {
      platform: KSERVE_ID,
      useReplicas: () => import('./src/deploymentExpandedDetails').then((m) => m.useKserveReplicas),
      useFramework: () =>
        import('./src/deploymentExpandedDetails').then((m) => m.useKserveFramework),
    },
  },
  {
    type: 'model-serving.platform/delete-modal',
    properties: {
      platform: KSERVE_ID,
      onDelete: () => import('./src/deployments').then((m) => m.deleteDeployment),
      title: 'Delete model deployment?',
      submitButtonLabel: 'Delete model deployment',
    },
  },
  {
    type: 'model-serving.metrics',
    properties: {
      platform: KSERVE_ID,
    },
    flags: {
      required: [SupportedArea.K_SERVE_METRICS],
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: KSERVE_ID,
      ServingDetailsComponent: () => import('./src/deploymentServingDetails'),
    },
  },
  {
    type: 'model-serving.deployments-table/start-stop-action',
    properties: {
      platform: KSERVE_ID,
      patchDeploymentStoppedStatus: () =>
        import('./src/deploymentStatus').then((m) => m.patchDeploymentStoppedStatus),
    },
  },
  {
    type: 'model-serving.platform/fetch-deployment-status',
    properties: {
      platform: KSERVE_ID,
      fetch: () => import('./src/deployments').then((m) => m.fetchDeploymentStatus),
    },
  },
];

export default extensions;

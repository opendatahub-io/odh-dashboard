// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
// eslint-disable-next-line no-restricted-syntax
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { ModelServingPlatformExtension } from '@odh-dashboard/model-serving/extension-points';

const extensions: ModelServingPlatformExtension[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: 'model-mesh',
      manage: {
        namespaceApplicationCase: NamespaceApplicationCase.MODEL_MESH_PROMOTION,
        projectRequirements: {
          labels: {
            'modelmesh-enabled': 'true',
          },
        },
      },
      enableCardText: {
        title: 'Multi-model serving platform',
        description:
          'Multiple models can be deployed on one shared model server. Choose this option when you want to deploy a number of small or medium-sized models that can share the server resources..',
        selectText: 'Select multi-model',
        enabledText: 'Multi-model serving enabled',
        objectType: ProjectObjectType.multiModel,
      },
      deployedModelsView: {
        startHintTitle: 'Start by adding a model server',
        startHintDescription:
          'Model servers are used to deploy models and to allow apps to send requests to your models. Configuring a model server includes specifying the number of replicas being deployed, the server size, the token authentication, the serving runtime, and how the project that the model server belongs to is accessed. ',
        deployButtonText: 'Add model server',
      },
      backport: {
        ModelsProjectDetailsTab: () =>
          import(
            '@odh-dashboard/internal/pages/modelServing/screens/projects/ModelServingPlatform'
          ),
        ServeModelsSection: () =>
          import(
            '@odh-dashboard/internal/pages/projects/screens/detail/overview/serverModels/ServeModelsSection'
          ),
        GlobalModelsPage: () =>
          import('@odh-dashboard/internal/pages/modelServing/ModelServingRoutes'),
      },
    },
    flags: {
      required: [SupportedArea.MODEL_MESH],
    },
  },
  {
    type: 'model-serving.platform',
    properties: {
      id: 'nim',
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
        startHintTitle: 'Start by adding a model server',
        startHintDescription:
          'Model servers are used to deploy models and to allow apps to send requests to your models. Configuring a model server includes specifying the number of replicas being deployed, the server size, the token authentication, the serving runtime, and how the project that the model server belongs to is accessed. ',
        deployButtonText: 'Add model server',
      },
      backport: {
        ModelsProjectDetailsTab: () =>
          import(
            '@odh-dashboard/internal/pages/modelServing/screens/projects/ModelServingPlatform'
          ),
        ServeModelsSection: () =>
          import(
            '@odh-dashboard/internal/pages/projects/screens/detail/overview/serverModels/ServeModelsSection'
          ),
        GlobalModelsPage: () =>
          import('@odh-dashboard/internal/pages/modelServing/ModelServingRoutes'),
      },
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
    },
  },
];

export default extensions;

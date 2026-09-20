import type {
  ModelServingPlatformExtension,
  ModelServingPlatformGlobalModelsPageExtension,
  ModelServingPlatformOverviewSectionExtension,
  ModelServingPlatformProjectDetailsTabExtension,
} from '@odh-dashboard/model-serving/extension-points';
// Allow this import as it consists of types and enums only.
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/consistent-type-imports
import { ProjectObjectType } from '@odh-dashboard/ui-core';
// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/k8s-core';
// Allow this import as it consists of constants only.
// eslint-disable-next-line no-restricted-syntax
import { NIM_LEGACY_ID } from '../src/constants';

const extensions: (
  | ModelServingPlatformExtension
  | ModelServingPlatformProjectDetailsTabExtension
  | ModelServingPlatformGlobalModelsPageExtension
  | ModelServingPlatformOverviewSectionExtension
)[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: NIM_LEGACY_ID,
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
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
      disallowed: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.platform/project-details-tab',
    properties: {
      platform: NIM_LEGACY_ID,
      component: () =>
        import('@odh-dashboard/internal/pages/modelServing/screens/projects/ModelServingPlatform'),
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
      disallowed: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.platform/overview-section',
    properties: {
      platform: NIM_LEGACY_ID,
      component: () =>
        import(
          '@odh-dashboard/internal/pages/projects/screens/detail/overview/serverModels/ServeModelsSection'
        ),
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
      disallowed: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.platform/global-models-page',
    properties: {
      platform: NIM_LEGACY_ID,
      component: () => import('@odh-dashboard/internal/pages/modelServing/ModelServingRoutes'),
    },
    flags: {
      required: [SupportedArea.NIM_MODEL],
      disallowed: [SupportedArea.NIM_WIZARD],
    },
  },
];

export default extensions;

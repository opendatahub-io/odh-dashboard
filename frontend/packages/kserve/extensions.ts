// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { ModelServingPlatformExtension } from '@odh-dashboard/model-serving/extension-points';

const extensions: ModelServingPlatformExtension[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: 'kserve',
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
      },
      deployedModelsView: {
        startHintTitle: 'Start by deploying a model',
        startHintDescription: 'Each model is deployed on its own model server',
        deployButtonText: 'Deploy model',
      },
    },
  },
  {
    type: 'model-serving.platform',
    properties: {
      id: 'modelmesh-dummy',
      manage: {
        namespaceApplicationCase: NamespaceApplicationCase.MODEL_MESH_PROMOTION,
        enabledLabel: 'modelmesh-enabled',
        enabledLabelValue: 'true',
      },
      enableCardText: {
        title: 'Multi-model serving platform',
        description:
          'Multiple models can be deployed on one shared model server. Useful for deploying a number of small or medium-sized models that can share the server resources.',
        selectText: 'Select multi-model',
        enabledText: 'Multi-model serving enabled',
      },
      deployedModelsView: {
        startHintTitle: 'Start by deploying a model',
        startHintDescription: 'Each model is deployed on its own model server',
        deployButtonText: 'Deploy model',
      },
    },
  },
];

export default extensions;

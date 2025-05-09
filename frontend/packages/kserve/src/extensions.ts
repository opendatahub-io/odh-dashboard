import type {
  ModelServingPlatform,
  ModelServingPlatformCard,
  ModelServingDeleteModal,
  ModelServingDeployedModel,
} from '@odh-dashboard/model-serving/extension-points';
import { deleteInferenceService, deleteServingRuntime } from '@odh-dashboard/internal/api/index';

const extensions: (ModelServingPlatform | ModelServingPlatformCard | ModelServingDeleteModal)[] = [
  {
    type: 'model-serving.platform',
    properties: {
      id: 'kserve',
      name: 'KServe',
    },
  },
  {
    type: 'model-serving.platform/card',
    properties: {
      platform: 'kserve',
      title: 'Single-model serving platform',
      description:
        'Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM).',
      selectText: 'Select single-model',
    },
  },
  {
    type: 'model-serving.platform/delete-modal',
    properties: {
      platform: 'kserve',
      onDelete: async (deployedModel: ModelServingDeployedModel) => {
        await Promise.all([
          deleteInferenceService(
            deployedModel.properties.resourceName,
            deployedModel.properties.namespace,
          ),
          deleteServingRuntime(
            deployedModel.properties.resourceName,
            deployedModel.properties.namespace,
          ),
        ]);
      },
      title: 'Delete deployed model?',
      submitButtonLabel: 'Delete deployed model',
    },
  },
];

export default extensions;

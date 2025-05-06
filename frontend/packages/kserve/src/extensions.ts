import type {
  ModelServingPlatform,
  ModelServingPlatformCard,
} from '@odh-dashboard/model-serving/extension-points';

const extensions: (ModelServingPlatform | ModelServingPlatformCard)[] = [
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
];

export default extensions;

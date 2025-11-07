import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { ModelServerTemplateField } from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const modelServerField: ModelServerTemplateField = {
  id: 'modelServerTemplate',
  type: 'modifier',
  isActive: (wizardFormData) => {
    return wizardFormData.modelType?.data === ServingRuntimeModelType.GENERATIVE;
  },
  extraOptions: [
    {
      name: LLMD_SERVING_ID,
      label: 'Distributed Inference Server with llm-d',
    },
  ],
  suggestion: (modelServingClusterSettings) => {
    return modelServingClusterSettings?.isLLMdDefault
      ? {
          name: LLMD_SERVING_ID,
          label: 'Distributed Inference Server with llm-d',
        }
      : undefined;
  },
};

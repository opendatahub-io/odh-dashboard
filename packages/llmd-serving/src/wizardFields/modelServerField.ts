import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ModelServerTemplateField,
  ModelTypeFieldData,
} from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_SERVING_ID } from '../../extensions/extensions';
import type { ModelServingClusterSettings } from '../../../model-serving/src/concepts/useModelServingClusterSettings';

export const modelServerField: ModelServerTemplateField = {
  id: 'modelServerTemplate',
  type: 'modifier',
  isActive: (modelType?: ModelTypeFieldData): boolean => {
    return modelType === ServingRuntimeModelType.GENERATIVE;
  },
  extraOptions: [
    {
      name: LLMD_SERVING_ID,
      label: 'Distributed Inference Server with llm-d',
    },
  ],
  suggestion: (modelServingClusterSettings?: ModelServingClusterSettings) => {
    return modelServingClusterSettings?.isLLMdDefault
      ? {
          name: LLMD_SERVING_ID,
          label: 'Distributed Inference Server with llm-d',
        }
      : undefined;
  },
};

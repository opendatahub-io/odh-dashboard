import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { ModelServerTemplateField } from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const modelServerField: ModelServerTemplateField = {
  id: 'modelServerTemplate',
  type: 'modifier',
  isActive: (modelType: ServingRuntimeModelType): boolean => {
    return modelType === ServingRuntimeModelType.GENERATIVE;
  },
  modelServerTemplates: [
    { name: LLMD_SERVING_ID, label: 'Distributed Inference Server with llm-d' },
  ],
};

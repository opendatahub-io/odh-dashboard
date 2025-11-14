import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { ModelServerTemplateField } from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_OPTION } from '../deployments/server';

export const modelServerField: ModelServerTemplateField = {
  id: 'modelServerTemplate',
  type: 'modifier',
  isActive: (wizardFormData) => {
    return wizardFormData.modelType?.data === ServingRuntimeModelType.GENERATIVE;
  },
  extraOptions: [LLMD_OPTION],
  suggestion: (modelServingClusterSettings) => {
    return modelServingClusterSettings?.isLLMdDefault ? LLMD_OPTION : undefined;
  },
};

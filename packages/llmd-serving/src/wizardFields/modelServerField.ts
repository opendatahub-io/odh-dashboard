import type { ModelServerTemplateField } from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_OPTION } from '../deployments/server';
import { isGenerativeNonLegacy } from '../formUtils';

export const modelServerField: ModelServerTemplateField = {
  id: 'modelServerTemplate',
  type: 'modifier',
  isActive: isGenerativeNonLegacy,
  extraOptions: [LLMD_OPTION],
  suggestion: (modelServingClusterSettings) => {
    return modelServingClusterSettings?.isLLMdDefault ? LLMD_OPTION : undefined;
  },
};

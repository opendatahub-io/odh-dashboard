import type { ModelServerTemplateFieldOverride } from '@odh-dashboard/model-serving/types/form-data';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { LLMD_OPTION } from '../deployments/server';

// Use for pre-vLLMonMaaS feature flag support
const shouldAddLLMDOptionToRuntimeTemplates: ModelServerTemplateFieldOverride['isActive'] = (
  wizardState,
) => {
  const modelType = wizardState.modelType?.data;
  const vLLMDeploymentOnMaaSEnabled = wizardState.devFeatureFlags?.vLLMDeploymentOnMaaS;

  if (!vLLMDeploymentOnMaaSEnabled && modelType?.type === ServingRuntimeModelType.GENERATIVE) {
    return true;
  }
  return false;
};

export const modelServerField: ModelServerTemplateFieldOverride = {
  id: 'modelServerTemplate',
  type: 'modifier',
  isActive: shouldAddLLMDOptionToRuntimeTemplates,
  extraOptions: [LLMD_OPTION],
  suggestion: (modelServingClusterSettings) => {
    return modelServingClusterSettings?.isLLMdDefault ? LLMD_OPTION : undefined;
  },
};

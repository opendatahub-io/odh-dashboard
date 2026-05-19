import { type RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { LLMD_OPTION } from './deployments/server';

/**
 * @returns `true` if "LLM-d" selected or an LLMInferenceServiceConfig selected
 */
export const isLLMInferenceServiceActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
  resources?: {
    model?: ModelResourceType;
  },
): boolean => {
  const isLLMOptionSelected =
    wizardState.modelServer?.data?.selection?.name === LLMD_OPTION.name ||
    wizardState.modelServer?.data?.selection?.template?.kind === 'LLMInferenceServiceConfig';
  const isLLMInferenceService = resources?.model?.kind === 'LLMInferenceService';

  return isLLMOptionSelected || isLLMInferenceService;
};

/**
 *
 * @returns `true` if Generative is selected and legacyVLLM is false (only possible with vLLM on MaaS enabled)
 */
export const isGenerativeNonLegacy = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const modelType = wizardState.modelType?.data;
  const vLLMDeploymentOnMaaSEnabled = wizardState.devFeatureFlags?.vLLMDeploymentOnMaaS;

  if (
    vLLMDeploymentOnMaaSEnabled &&
    modelType?.type === ServingRuntimeModelType.GENERATIVE &&
    !modelType.legacyVLLM
  ) {
    return true;
  }
  return false;
};

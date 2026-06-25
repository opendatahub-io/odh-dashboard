import { type RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import {
  LLMD_DEPLOYMENT_METHOD_KEY,
  SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY,
} from './wizardFields/deploymentMethodField';
import { LLMdDeployment } from './types';

/**
 * @returns `true` if "LLM-d" selected or an LLMInferenceServiceConfig selected
 */
export const isLLMInferenceServiceActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
  resources?: {
    model?: ModelResourceType;
  },
): boolean => {
  const deploymentMethodOption = wizardState.deploymentMethod?.method;

  const isLLMOptionSelected =
    deploymentMethodOption === SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY ||
    deploymentMethodOption === LLMD_DEPLOYMENT_METHOD_KEY;
  const isLLMInferenceService = resources?.model?.kind === 'LLMInferenceService';

  return isLLMOptionSelected || isLLMInferenceService;
};

/**
 *
 * @returns `true` if Generative is selected and the simple vLLM deployment method is chosen (only possible with vLLM on MaaS enabled)
 */
export const isSimpleLLMInferenceService = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const modelType = wizardState.modelType?.data;
  const deploymentMethodOption = wizardState.deploymentMethod?.method;
  const vLLMDeploymentOnMaaSEnabled = wizardState.devFeatureFlags?.vLLMDeploymentOnMaaS;

  if (
    vLLMDeploymentOnMaaSEnabled &&
    modelType?.type === ServingRuntimeModelType.GENERATIVE &&
    deploymentMethodOption === SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY
  ) {
    return true;
  }
  return false;
};

/**
 * @returns `true` if the `spec.router.scheduler` exists
 */
export const isLLMd = (deployment: LLMdDeployment): boolean => {
  return !!deployment.model.spec.router && 'scheduler' in deployment.model.spec.router;
};

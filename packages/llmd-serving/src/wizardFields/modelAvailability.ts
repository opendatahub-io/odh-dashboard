import type {
  ModelAvailabilityField,
  WizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import { type LLMdDeployment, type LLMInferenceServiceKind } from '../types';
import { isLLMInferenceServiceActive } from '../formUtils';

export const modelAvailabilityField: ModelAvailabilityField = {
  id: 'modelAvailability',
  type: 'modifier',
  isActive: isLLMInferenceServiceActive,
  // MaaS checkbox is now provided by the maas package via WizardField2Extension
  showSaveAsMaaS: false,
};

export const extractModelAvailabilityData = (
  deployment: LLMdDeployment,
): WizardFormData['state']['modelAvailability']['data'] => {
  return {
    saveAsAiAsset: deployment.model.metadata.labels?.['opendatahub.io/genai-asset'] === 'true',
    useCase: deployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'],
  };
};

/**
 * Applies model availability data (AI Asset settings) to the deployment.
 * Note: MaaS-specific settings are now handled by the maas package's
 * WizardFieldTransformerExtension (applyMaaSEndpointData).
 */
export const applyModelAvailabilityData = (
  deployment: LLMInferenceServiceKind,
  modelAvailability?: WizardFormData['state']['modelAvailability']['data'],
): LLMInferenceServiceKind => {
  const result = structuredClone(deployment);

  // Clear existing AI Asset labels and annotations (MaaS is handled separately by transformer)
  delete result.metadata.labels?.['opendatahub.io/genai-asset'];
  delete result.metadata.annotations?.['opendatahub.io/genai-use-case'];

  // Apply AI Asset settings
  if (modelAvailability?.saveAsAiAsset) {
    result.metadata.labels = {
      ...result.metadata.labels,
      'opendatahub.io/genai-asset': 'true',
    };
  }

  // Apply use case annotation if AI Asset is enabled
  if (modelAvailability?.useCase && modelAvailability.saveAsAiAsset) {
    result.metadata.annotations = {
      ...result.metadata.annotations,
      'opendatahub.io/genai-use-case': modelAvailability.useCase,
    };
  }

  return result;
};

import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type { AiAssetFieldValue } from './AiAssetEndpointCheckbox';

/**
 * Applies AI Asset endpoint configuration to an LLMInferenceService deployment.
 * When enabled, adds the genai-asset label and optionally the use-case annotation.
 * When disabled, removes the genai-asset label and use-case annotation.
 *
 * Fix for RHOAIENG-37896: These transformers enable proper storage and retrieval
 * of AAA checkbox state in deployment metadata.
 */
export const applyAiAssetEndpointData = (
  deployment: LLMdDeployment,
  fieldData: AiAssetFieldValue,
): LLMdDeployment => {
  const result = structuredClone(deployment);

  // Initialize metadata structures if they don't exist
  result.model.metadata.labels = result.model.metadata.labels || {};
  result.model.metadata.annotations = result.model.metadata.annotations || {};

  if (fieldData.saveAsAiAsset) {
    // Add the genai-asset label
    result.model.metadata.labels['opendatahub.io/genai-asset'] = 'true';

    // Add use case annotation if provided
    if (fieldData.useCase && fieldData.useCase.trim()) {
      result.model.metadata.annotations['opendatahub.io/genai-use-case'] = fieldData.useCase;
    } else {
      // Remove use case annotation if empty
      delete result.model.metadata.annotations['opendatahub.io/genai-use-case'];
    }
  } else {
    // Remove both label and annotation when disabled
    delete result.model.metadata.labels['opendatahub.io/genai-asset'];
    delete result.model.metadata.annotations['opendatahub.io/genai-use-case'];
  }

  return result;
};

/**
 * Extracts AI Asset endpoint configuration from an LLMInferenceService deployment.
 * Returns the field value if the genai-asset label is present.
 */
export const extractAiAssetEndpointData = (
  deployment: LLMdDeployment,
): AiAssetFieldValue | undefined => {
  const hasAiAssetLabel =
    deployment.model.metadata.labels?.['opendatahub.io/genai-asset'] === 'true';

  if (!hasAiAssetLabel) {
    return undefined;
  }

  return {
    saveAsAiAsset: true,
    useCase: deployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'] || '',
  };
};

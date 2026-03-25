import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ModelAvailabilityField,
  WizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';
import { LLMD_OPTION } from '../deployments/server';

/**
 * Annotation key for MaaS tiers configuration.
 * Note: MaaS-specific functionality is now handled by the maas package via
 * WizardFieldTransformerExtension and WizardFieldExtractorExtension.
 * This constant is kept for type definitions and backwards compatibility.
 */
export const MAAS_TIERS_ANNOTATION = 'alpha.maas.opendatahub.io/tiers';

export const modelAvailabilityField: ModelAvailabilityField = {
  id: 'modelAvailability',
  type: 'modifier',
  isActive: (wizardFormData) => {
    return (
      wizardFormData.modelType?.data?.type === ServingRuntimeModelType.GENERATIVE &&
      !wizardFormData.modelType.data.legacyVLLM &&
      wizardFormData.modelServer?.data?.selection?.name === LLMD_OPTION.name
    );
  },
  // MaaS checkbox is now provided by the maas package via WizardField2Extension
  showSaveAsMaaS: false,
};

// DEPRECATED: AAA and MaaS data are now extracted by their respective package extensions.
// This function is kept for backwards compatibility but returns empty/default values.
// See: RHOAIENG-37896 (AAA moved to gen-ai package), MaaS already in maas package.
export const extractModelAvailabilityData = (
  deployment: LLMdDeployment,
): WizardFormData['state']['modelAvailability']['data'] => {
  return {
    saveAsAiAsset: deployment.model.metadata.labels?.['opendatahub.io/genai-asset'] === 'true',
    // Note: MaaS data is now extracted by the maas package's WizardFieldExtractorExtension
    // AAA data is now extracted by the gen-ai package's WizardFieldExtractorExtension
    // These fields are kept for backwards compatibility
    saveAsMaaS: !!deployment.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION],
    useCase: deployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'],
  };
};

/**
 * DEPRECATED: This function no longer modifies deployment data.
 * AI Asset settings are now handled by the gen-ai package's WizardFieldApplyExtension.
 * MaaS settings are handled by the maas package's WizardFieldApplyExtension.
 * This function is kept for backwards compatibility but returns the deployment unchanged.
 * See: RHOAIENG-37896
 */
export const applyModelAvailabilityData = (
  deployment: LLMInferenceServiceKind,
  modelAvailability?: WizardFormData['state']['modelAvailability']['data'],
): LLMInferenceServiceKind => {
  // No-op: Extensions now handle this data
  // - AAA: gen-ai package's applyAiAssetEndpointData
  // - MaaS: maas package's applyMaaSEndpointData
  return deployment;
};

import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ModelAvailabilityField,
  WizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import { MAAS_DEFAULT_GATEWAY, MAAS_ENDPOINT_LABEL, MAAS_TIERS_ANNOTATION } from '../types';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';
import { LLMD_OPTION } from '../deployments/server';

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

export const extractModelAvailabilityData = (
  deployment: LLMdDeployment,
): WizardFormData['state']['modelAvailability']['data'] => ({
  saveAsAiAsset: deployment.model.metadata.labels?.['opendatahub.io/genai-asset'] === 'true',
  saveAsMaaS:
    deployment.model.metadata.labels?.[MAAS_ENDPOINT_LABEL] === 'true' ||
    !!deployment.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION] ||
    (deployment.model.spec.router?.gateway?.refs?.some(
      (ref) =>
        ref.name === MAAS_DEFAULT_GATEWAY.name && ref.namespace === MAAS_DEFAULT_GATEWAY.namespace,
    ) ??
      false),
  useCase: deployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'],
});

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

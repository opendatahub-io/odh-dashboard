import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ModelAvailabilityField,
  WizardFormData,
  InitialWizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import type { LLMdDeployment, LLMInferenceServiceKind } from 'src/types';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const MAAS_TIERS_ANNOTATION = 'alpha.maas.opendatahub.io/tiers';
const DEFAULT_MAAS_TIERS_VALUE = JSON.stringify({
  gateway: 'maas-default-gateway',
  tiers: [],
});

export const modelAvailabilityField: ModelAvailabilityField = {
  id: 'modelAvailability',
  type: 'modifier',
  isActive: (data: Partial<WizardFormData['state']>): boolean => {
    return (
      data.modelType?.data === ServingRuntimeModelType.GENERATIVE &&
      data.modelServer?.data?.name === LLMD_SERVING_ID
    );
  },
  modifier: (stateInput, stateOutput) => {
    return { ...stateOutput, showSaveAsMaaS: true };
  },
};

export const extractModelAvailabilityData = (
  deployment: LLMdDeployment,
): InitialWizardFormData['modelAvailability'] => {
  return {
    saveAsAiAsset: deployment.model.metadata.annotations?.['opendatahub.io/genai-asset'] === 'true',
    saveAsMaaS:
      deployment.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION] !== DEFAULT_MAAS_TIERS_VALUE,
    useCase: deployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'],
  };
};

export const applyModelAvailabilityData = (
  deployment: LLMInferenceServiceKind,
  modelAvailability?: WizardFormData['state']['modelAvailability']['data'],
): LLMInferenceServiceKind => {
  const result = structuredClone(deployment);

  // if MaaS is already present, don't override it
  const maasTiersValue =
    result.metadata.annotations?.[MAAS_TIERS_ANNOTATION] || DEFAULT_MAAS_TIERS_VALUE;

  delete result.metadata.annotations?.['opendatahub.io/genai-asset'];
  delete result.metadata.annotations?.['opendatahub.io/genai-use-case'];
  delete result.metadata.annotations?.[MAAS_TIERS_ANNOTATION];

  result.metadata.annotations = {
    ...result.metadata.annotations,
    ...(modelAvailability?.saveAsAiAsset && {
      'opendatahub.io/genai-asset': 'true',
      ...(modelAvailability.saveAsMaaS && {
        [MAAS_TIERS_ANNOTATION]: maasTiersValue,
      }),
    }),
    ...(modelAvailability?.useCase &&
      (modelAvailability.saveAsAiAsset || modelAvailability.saveAsMaaS) && {
        'opendatahub.io/genai-use-case': modelAvailability.useCase,
      }),
  };

  return result;
};

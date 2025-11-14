import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ModelAvailabilityField,
  WizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../types';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const MAAS_TIERS_ANNOTATION = 'alpha.maas.opendatahub.io/tiers';
const DEFAULT_MAAS_TIERS_VALUE = '[]';
const DEFAULT_MAAS_GATEWAY_REF = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
};

export const modelAvailabilityField: ModelAvailabilityField = {
  id: 'modelAvailability',
  type: 'modifier',
  isActive: (wizardFormData) => {
    return (
      wizardFormData.modelType?.data === ServingRuntimeModelType.GENERATIVE &&
      wizardFormData.modelServer?.data?.name === LLMD_SERVING_ID
    );
  },
  showSaveAsMaaS: true,
};

export const extractModelAvailabilityData = (
  deployment: LLMdDeployment,
): WizardFormData['state']['modelAvailability']['data'] => {
  return {
    saveAsAiAsset: deployment.model.metadata.labels?.['opendatahub.io/genai-asset'] === 'true',
    saveAsMaaS: !!deployment.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION],
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
  const gatewayRefs = result.spec.router?.gateway?.refs ?? [DEFAULT_MAAS_GATEWAY_REF];

  delete result.metadata.labels?.['opendatahub.io/genai-asset'];
  delete result.metadata.annotations?.['opendatahub.io/genai-use-case'];
  delete result.metadata.annotations?.[MAAS_TIERS_ANNOTATION];

  result.metadata.annotations = {
    ...result.metadata.annotations,
    ...(modelAvailability?.saveAsMaaS && {
      [MAAS_TIERS_ANNOTATION]: maasTiersValue,
    }),
    ...(modelAvailability?.useCase &&
      (modelAvailability.saveAsAiAsset || modelAvailability.saveAsMaaS) && {
        'opendatahub.io/genai-use-case': modelAvailability.useCase,
      }),
  };
  result.metadata.labels = {
    ...result.metadata.labels,
    ...(modelAvailability?.saveAsAiAsset && {
      'opendatahub.io/genai-asset': 'true',
    }),
  };

  delete result.spec.router?.gateway?.refs;
  if (modelAvailability?.saveAsMaaS) {
    result.spec.router = {
      ...result.spec.router,
      gateway: {
        ...result.spec.router?.gateway,
        refs: gatewayRefs,
      },
    };
  }

  return result;
};

import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import { MaaSTierValue, TierDropdownOption } from './MaaSEndpointCheckbox';

export const MAAS_TIERS_ANNOTATION = 'alpha.maas.opendatahub.io/tiers';

const DEFAULT_MAAS_GATEWAY_REF = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
};

/**
 * Converts the MaaSTierValue UI state to the annotation value stored in the deployment.
 *
 * - `undefined` (isChecked: false) = MaaS not enabled, no annotation
 * - `null` (isChecked: true, tiersDropdownSelection: 'no-tiers') = MaaS enabled but no tiers
 * - `[]` (isChecked: true, tiersDropdownSelection: 'all-tiers') = MaaS enabled, all tiers
 * - `[string, ...]` (isChecked: true, tiersDropdownSelection: 'specify-tiers') = specific tiers
 */
const convertTierValueToAnnotation = (tierValue: MaaSTierValue): string | undefined => {
  if (!tierValue.isChecked) {
    return undefined;
  }

  switch (tierValue.tiersDropdownSelection) {
    case 'no-tiers':
      return 'null';
    case 'specify-tiers': {
      return JSON.stringify(tierValue.selectedTierNames ?? []);
    }
    case 'all-tiers':
    default:
      return '[]';
  }
};

/**
 * Converts the annotation value from the deployment to the MaaSTierValue UI state.
 */
const convertAnnotationToTierValue = (
  annotationValue: string | undefined,
): MaaSTierValue | undefined => {
  if (annotationValue === undefined) {
    return undefined;
  }

  if (annotationValue === 'null') {
    return {
      isChecked: true,
      tiersDropdownSelection: TierDropdownOption.NoTiers,
      selectedTierNames: undefined,
    };
  }

  try {
    const parsed: unknown = JSON.parse(annotationValue);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return {
          isChecked: true,
          tiersDropdownSelection: TierDropdownOption.AllTiers,
          selectedTierNames: [],
        };
      }
      // Specific tiers
      return {
        isChecked: true,
        tiersDropdownSelection: TierDropdownOption.SpecifyTiers,
        selectedTierNames: parsed,
      };
    }
  } catch {
    // Invalid JSON, treat as not enabled
  }

  return undefined;
};

/**
 * Transforms an LLMInferenceServiceKind deployment by applying MaaS endpoint configuration.
 * This is called during the deploy action when the MaaS endpoint checkbox field is active.
 */
export const applyMaaSEndpointData = (
  deployment: LLMdDeployment,
  fieldData: MaaSTierValue,
): LLMdDeployment => {
  const result = structuredClone(deployment);

  // Get existing gateway refs or use default
  const gatewayRefs = result.model.spec.router?.gateway?.refs ?? [DEFAULT_MAAS_GATEWAY_REF];

  // Remove existing MaaS annotation
  if (result.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION] !== undefined) {
    delete result.model.metadata.annotations[MAAS_TIERS_ANNOTATION];
  }

  // Remove existing gateway refs
  if (result.model.spec.router?.gateway?.refs !== undefined) {
    delete result.model.spec.router.gateway.refs;
  }

  // Apply new MaaS configuration if enabled
  const annotationValue = convertTierValueToAnnotation(fieldData);
  if (annotationValue !== undefined) {
    result.model.metadata.annotations = {
      ...result.model.metadata.annotations,
      [MAAS_TIERS_ANNOTATION]: annotationValue,
    };

    result.model.spec.router = {
      ...result.model.spec.router,
      gateway: {
        ...result.model.spec.router?.gateway,
        refs: gatewayRefs,
      },
    };
  }

  return result;
};

/**
 * Extracts MaaS endpoint configuration from an LLMInferenceServiceKind deployment.
 * This is called when editing an existing deployment to populate the MaaS checkbox field.
 */
export const extractMaaSEndpointData = (deployment: LLMdDeployment): MaaSTierValue | undefined => {
  const annotationValue = deployment.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION];
  return convertAnnotationToTierValue(annotationValue);
};

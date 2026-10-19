import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { isGatewayOption, type GatewayOption } from '../api/services/gatewayDiscovery';
import type { GatewaySelectFieldData } from '../wizardFields/gateway/GatewaySelectField';

export const LLMD_GATEWAY_FIELD_ID = 'llmd-serving/gateway';

/** Platform default gateways used for Segment default-vs-custom flags. */
export const MAAS_DEFAULT_GATEWAY_REF = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
} as const;

export const OPENSHIFT_AI_INFERENCE_GATEWAY_REF = {
  name: 'openshift-ai-inference',
  namespace: 'openshift-ingress',
} as const;

export type LlmdGatewayTrackingProperties = {
  numberOfGateways: number;
  usesMaasDefault: boolean;
  usesOpenShiftInference: boolean;
  usesCustomGateway: boolean;
};

type TrackingProperties = Record<string, string | number | boolean | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isGatewaySelectFieldData = (value: unknown): value is GatewaySelectFieldData =>
  isRecord(value) && Array.isArray(value.selections) && value.selections.every(isGatewayOption);

const isSameGatewayRef = (
  gateway: GatewayOption,
  ref: { name: string; namespace: string },
): boolean => gateway.name === ref.name && gateway.namespace === ref.namespace;

const isPlatformDefaultGateway = (gateway: GatewayOption): boolean =>
  isSameGatewayRef(gateway, MAAS_DEFAULT_GATEWAY_REF) ||
  isSameGatewayRef(gateway, OPENSHIFT_AI_INFERENCE_GATEWAY_REF);

export const getLlmdGatewayTrackingProperties = (
  selections: GatewayOption[],
): LlmdGatewayTrackingProperties => ({
  numberOfGateways: selections.length,
  usesMaasDefault: selections.some((gateway) =>
    isSameGatewayRef(gateway, MAAS_DEFAULT_GATEWAY_REF),
  ),
  usesOpenShiftInference: selections.some((gateway) =>
    isSameGatewayRef(gateway, OPENSHIFT_AI_INFERENCE_GATEWAY_REF),
  ),
  usesCustomGateway: selections.some((gateway) => !isPlatformDefaultGateway(gateway)),
});

/**
 * Per-platform properties merged into Model Deployed / Model Updated for llm-d.
 * Returns an empty object when the gateway field is not present in wizard state
 * (e.g. feature flag off) so non-gateway flows stay unaffected.
 */
export const getLlmdWizardTrackingProperties = (
  wizardState: WizardFormData['state'],
): TrackingProperties => {
  const gatewayFieldData = wizardState[LLMD_GATEWAY_FIELD_ID];
  if (!isGatewaySelectFieldData(gatewayFieldData)) {
    return {};
  }

  return getLlmdGatewayTrackingProperties(gatewayFieldData.selections);
};

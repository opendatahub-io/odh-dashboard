import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  isGatewayOption,
  type GatewayOption,
} from '@odh-dashboard/model-serving/shared/api/gatewayDiscovery';
import {
  ACCELERATOR_CONFIG_DEFAULT,
  ACCELERATOR_CONFIG_FIELD_ID,
  CUSTOM_TOPOLOGY_CONFIG_FIELD_ID,
  CONFIG_TYPE_LABEL,
  LLMD_GATEWAY_FIELD_ID,
  LLMD_ROUTING_FIELD_ID,
  TOPOLOGY_CONFIG_DEFAULT,
  TOPOLOGY_TYPE_FIELD_ID,
} from '../const';
import { TopologyType, isTopologyTypeFieldData } from '../types';
import type { GatewaySelectFieldData } from '../wizardFields/gateway/GatewaySelectField';

/** Platform default gateways used for Segment default-vs-custom flags. */
export const MAAS_DEFAULT_GATEWAY_REF = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
} as const;

export const OPENSHIFT_AI_INFERENCE_GATEWAY_REF = {
  name: 'openshift-ai-inference',
  namespace: 'openshift-ingress',
} as const;

/** Complete gateway summary: even an empty selection produces a count and all three flags. */
export type LlmdGatewayTrackingProperties = {
  numberOfGateways: number;
  usesMaasDefault: boolean;
  usesOpenShiftInference: boolean;
  usesCustomGateway: boolean;
};

/** Wizard configuration values. Unavailable values are omitted, e.g. when cancelling early. */
export type LlmdDeploymentConfigurationTrackingProperties = {
  llmdComposablePattern?: string;
  isDefaultTopology?: boolean;
  isDefaultAccelerator?: boolean;
  isDefaultRouting?: boolean;
};

/** Combined event properties. Gateway fields are optional because that wizard field may be absent. */
export type LlmdDeploymentTrackingProperties = LlmdDeploymentConfigurationTrackingProperties &
  Partial<LlmdGatewayTrackingProperties>;

/** The topology extractor owns only these two configuration properties; retain their optionality. */
type TopologyTrackingProperties = Pick<
  LlmdDeploymentConfigurationTrackingProperties,
  'llmdComposablePattern' | 'isDefaultTopology'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/**
 * Return true only when a selected resource or saved edit reference establishes a custom choice.
 * Keep this name-free: config names are user-generated and are not needed for a boolean event flag.
 */
const hasCustomConfigSelection = (fieldData: unknown): boolean => {
  if (!isRecord(fieldData)) {
    return false;
  }
  if (fieldData.selectedConfig !== undefined) {
    return isRecord(fieldData.selectedConfig) && isRecord(fieldData.selectedConfig.metadata);
  }
  return isNonEmptyString(fieldData.configRef);
};

const isGatewaySelectFieldData = (value: unknown): value is GatewaySelectFieldData =>
  isRecord(value) && Array.isArray(value.selections) && value.selections.every(isGatewayOption);

const isSameGatewayRef = (
  gateway: GatewayOption,
  ref: { name: string; namespace: string },
): boolean => gateway.name === ref.name && gateway.namespace === ref.namespace;

const isPlatformDefaultGateway = (gateway: GatewayOption): boolean =>
  isSameGatewayRef(gateway, MAAS_DEFAULT_GATEWAY_REF) ||
  isSameGatewayRef(gateway, OPENSHIFT_AI_INFERENCE_GATEWAY_REF);

/** Calculate gateway usage flags from already-validated selections. */
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
 * Read the optional gateway wizard field. Return no gateway properties if it is absent (e.g. its
 * feature flag is off) or malformed, rather than reporting zero gateways for a field never shown.
 */
const extractGatewayTrackingProperties = (
  state: WizardFormData['state'],
): Partial<LlmdGatewayTrackingProperties> => {
  const fieldData = state[LLMD_GATEWAY_FIELD_ID];
  return isGatewaySelectFieldData(fieldData)
    ? getLlmdGatewayTrackingProperties(fieldData.selections)
    : {};
};

/** Report a valid topology pattern and its compatible configuration, omitting unresolved values. */
const extractTopologyTrackingProperties = (
  state: WizardFormData['state'],
): TopologyTrackingProperties => {
  // Without a recognized topology, neither the pattern nor its configuration can be reported.
  const topology = state[TOPOLOGY_TYPE_FIELD_ID];
  if (!isTopologyTypeFieldData(topology)) {
    return {};
  }

  // The analytics contract calls the topology type "llmdComposablePattern".
  // Keep reporting it even when the configuration is missing or still resolving.
  const pattern = { llmdComposablePattern: topology.topologyType };
  const config = state[CUSTOM_TOPOLOGY_CONFIG_FIELD_ID];
  if (!isRecord(config)) {
    return pattern;
  }

  // The built-in topology configuration is valid only for single-node serving.
  if (config.selectedConfig === TOPOLOGY_CONFIG_DEFAULT) {
    return topology.topologyType === TopologyType.SINGLE_NODE
      ? { ...pattern, isDefaultTopology: true }
      : pattern;
  }

  // Reject a known topology mismatch. Unlabelled edit configurations may still be valid.
  const { selectedConfig } = config;
  const labels =
    isRecord(selectedConfig) && isRecord(selectedConfig.metadata)
      ? selectedConfig.metadata.labels
      : undefined;
  const configTopology = isRecord(labels) ? labels[CONFIG_TYPE_LABEL] : undefined;
  if (configTopology !== undefined && configTopology !== topology.topologyType) {
    return pattern;
  }

  // Inspect resource names locally for validity, but never send user-generated names.
  const isDefaultTopology = hasCustomConfigSelection(config) ? false : undefined;
  return {
    ...pattern,
    ...(isDefaultTopology !== undefined && { isDefaultTopology }),
  };
};

/** Extract non-gateway deployment settings independently of the gateway field's availability. */
const extractDeploymentConfigurationTrackingProperties = (
  state: WizardFormData['state'],
): LlmdDeploymentConfigurationTrackingProperties => {
  // Report built-in versus resource-backed configuration without sending resource names.
  const accelerator = state[ACCELERATOR_CONFIG_FIELD_ID];
  const isDefaultAccelerator =
    isRecord(accelerator) && accelerator.selectedConfig === ACCELERATOR_CONFIG_DEFAULT
      ? true
      : isRecord(accelerator) && hasCustomConfigSelection(accelerator)
      ? false
      : undefined;

  // An existing routing field with neither a selection nor an edit reference means default routing.
  // An absent field does not imply a default and contributes no routing property.
  const routing = state[LLMD_ROUTING_FIELD_ID];
  const isDefaultRouting =
    isRecord(routing) && routing.selectedConfig === undefined && routing.configRef === undefined
      ? true
      : isRecord(routing) && hasCustomConfigSelection(routing)
      ? false
      : undefined;

  // Include only available values so incomplete/cancelled forms do not fabricate configuration.
  return {
    ...extractTopologyTrackingProperties(state),
    ...(isDefaultAccelerator !== undefined && { isDefaultAccelerator }),
    ...(isDefaultRouting !== undefined && { isDefaultRouting }),
  };
};

/**
 * Per-platform properties merged into Model Deployed / Model Updated for llm-d by the shared
 * deployment tracking pipeline. This extractor does not fire an event itself.
 *
 * Configuration and gateway properties are independent: when the gateway field is absent (e.g.
 * its feature flag is off), omit only gateway properties and retain available configuration.
 * Return an empty object only when neither group has usable data, such as an incomplete cancel.
 */
export const extractLlmdDeploymentTrackingProperties = (
  state: WizardFormData['state'],
): LlmdDeploymentTrackingProperties => ({
  ...extractDeploymentConfigurationTrackingProperties(state),
  ...extractGatewayTrackingProperties(state),
});

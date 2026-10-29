import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { isGatewayOption, type GatewayOption } from '../api/services/gatewayDiscovery';
import {
  ACCELERATOR_CONFIG_DEFAULT,
  ACCELERATOR_CONFIG_FIELD_ID,
  CUSTOM_TOPOLOGY_CONFIG_FIELD_ID,
  CONFIG_TYPE_LABEL,
  DEFAULT_ROUTING_KEY,
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
  deploymentMethod?: string;
  llmdComposablePattern?: string;
  topologyConfigurationId?: string;
  hardwareProfile?: string;
  replicaCount?: number;
  acceleratorConfigurationId?: string;
  routingConfigurationId?: string;
};

/** Combined event properties. Gateway fields are optional because that wizard field may be absent. */
export type LlmdDeploymentTrackingProperties = LlmdDeploymentConfigurationTrackingProperties &
  Partial<LlmdGatewayTrackingProperties>;

/** The topology extractor owns only these two configuration properties; retain their optionality. */
type TopologyTrackingProperties = Pick<
  LlmdDeploymentConfigurationTrackingProperties,
  'llmdComposablePattern' | 'topologyConfigurationId'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const getConfigName = (value: unknown): string | undefined => {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    return undefined;
  }
  return isNonEmptyString(value.metadata.name) ? value.metadata.name : undefined;
};

/**
 * Use the saved configRef while selectedConfig is undefined; omit the ID if a selection is present
 * but invalid.
 */
const getSelectedConfigId = (fieldData: unknown): string | undefined => {
  if (!isRecord(fieldData)) {
    return undefined;
  }
  if (fieldData.selectedConfig !== undefined) {
    return getConfigName(fieldData.selectedConfig);
  }
  return isNonEmptyString(fieldData.configRef) ? fieldData.configRef : undefined;
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
      ? { ...pattern, topologyConfigurationId: TOPOLOGY_CONFIG_DEFAULT }
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

  // Prefer the selected resource name; use configRef only while selection is unresolved.
  const topologyConfigurationId = getSelectedConfigId(config);
  return {
    ...pattern,
    ...(topologyConfigurationId !== undefined && { topologyConfigurationId }),
  };
};

/** Extract non-gateway deployment settings independently of the gateway field's availability. */
const extractDeploymentConfigurationTrackingProperties = (
  state: WizardFormData['state'],
): LlmdDeploymentConfigurationTrackingProperties => {
  // Preserve the method key used by the deployment-method selection event for funnel matching.
  const methodData: unknown = state.deploymentMethod;
  const deploymentMethod =
    isRecord(methodData) && isNonEmptyString(methodData.method) ? methodData.method : undefined;

  // A retained profile selection is not applied when the user chooses existing resource settings.
  const hardwareData: unknown = state.hardwareProfileConfig;
  const hardwareProfile =
    isRecord(hardwareData) &&
    isRecord(hardwareData.formData) &&
    hardwareData.formData.useExistingSettings !== true
      ? getConfigName(hardwareData.formData.selectedProfile)
      : undefined;

  // KServe's top-level WorkloadSpec is the decode workload when prefill is configured:
  // https://github.com/kserve/kserve/blob/master/pkg/apis/serving/v1alpha2/llm_inference_service_types.go
  // Keep this aligned with applyReplicas, which writes the same wizard value to spec.replicas.
  const replicasData: unknown = state.numReplicas;
  const replicas = isRecord(replicasData) ? replicasData.data : undefined;
  const replicaCount =
    typeof replicas === 'number' && Number.isFinite(replicas) && replicas >= 0
      ? replicas
      : undefined;

  // Translate the built-in-image sentinel to the analytics default; otherwise resolve the config ID.
  const accelerator = state[ACCELERATOR_CONFIG_FIELD_ID];
  const acceleratorConfigurationId =
    isRecord(accelerator) && accelerator.selectedConfig === ACCELERATOR_CONFIG_DEFAULT
      ? 'default'
      : getSelectedConfigId(accelerator);

  // An existing routing field with neither a selection nor an edit reference means default routing.
  // An absent field does not imply a default and contributes no routing property.
  const routing = state[LLMD_ROUTING_FIELD_ID];
  const routingConfigurationId =
    isRecord(routing) && routing.selectedConfig === undefined && routing.configRef === undefined
      ? DEFAULT_ROUTING_KEY
      : getSelectedConfigId(routing);

  // Include only available values so incomplete/cancelled forms do not fabricate configuration.
  return {
    ...extractTopologyTrackingProperties(state),
    ...(deploymentMethod !== undefined && { deploymentMethod }),
    ...(hardwareProfile !== undefined && { hardwareProfile }),
    ...(replicaCount !== undefined && { replicaCount }),
    ...(acceleratorConfigurationId !== undefined && { acceleratorConfigurationId }),
    ...(routingConfigurationId !== undefined && { routingConfigurationId }),
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

import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { isGatewayOption, type GatewayOption } from '../api/services/gatewayDiscovery';
import {
  ACCELERATOR_CONFIG_DEFAULT,
  ACCELERATOR_CONFIG_FIELD_ID,
  CUSTOM_TOPOLOGY_CONFIG_FIELD_ID,
  DEFAULT_ROUTING_KEY,
  TOPOLOGY_CONFIG_DEFAULT,
  TOPOLOGY_TYPE_FIELD_ID,
} from '../const';
import { TopologyType } from '../types';
import { isTopologyTypeFieldData } from '../wizardFields/TopologyTypeField';

export const LLMD_GATEWAY_FIELD_ID = 'llmd-serving/gateway';
export const LLMD_ROUTING_FIELD_ID = 'llmd-serving/advanced-routing';

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

export type LlmdComposableTrackingProperties = {
  deploymentMethod?: string;
  llmdComposablePattern?: string;
  topologyConfigurationId?: string;
  hardwareProfile?: string;
  replicaCount?: number;
  acceleratorConfigurationId?: string;
  routingConfigurationId?: string;
};

type TrackingPropertyMap = Record<string, string | number | boolean | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getField = (state: WizardFormData['state'], fieldId: string): unknown => state[fieldId];

const getConfigName = (value: unknown): string | undefined => {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    return undefined;
  }
  return typeof value.metadata.name === 'string' && value.metadata.name.length > 0
    ? value.metadata.name
    : undefined;
};

const isGatewaySelectFieldData = (value: unknown): value is { selections: GatewayOption[] } =>
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

const getComposableTrackingProperties = (
  wizardState: WizardFormData['state'],
): LlmdComposableTrackingProperties => {
  const properties: LlmdComposableTrackingProperties = {};

  const deploymentMethod = getField(wizardState, 'deploymentMethod');
  if (
    isRecord(deploymentMethod) &&
    typeof deploymentMethod.method === 'string' &&
    deploymentMethod.method.length > 0
  ) {
    properties.deploymentMethod = deploymentMethod.method;
  }

  const topology = getField(wizardState, TOPOLOGY_TYPE_FIELD_ID);
  if (isTopologyTypeFieldData(topology)) {
    properties.llmdComposablePattern = topology.topologyType;
    const topologyConfig = getField(wizardState, CUSTOM_TOPOLOGY_CONFIG_FIELD_ID);
    if (isRecord(topologyConfig)) {
      if (topologyConfig.selectedConfig === TOPOLOGY_CONFIG_DEFAULT) {
        properties.topologyConfigurationId = TOPOLOGY_CONFIG_DEFAULT;
      } else {
        const configName = getConfigName(topologyConfig.selectedConfig);
        if (configName) {
          properties.topologyConfigurationId = configName;
        } else if (
          typeof topologyConfig.configRef === 'string' &&
          topologyConfig.configRef.length > 0
        ) {
          properties.topologyConfigurationId = topologyConfig.configRef;
        }
      }
    } else if (topology.topologyType === TopologyType.SINGLE_NODE) {
      // Single-node implicitly uses the built-in topology configuration.
      properties.topologyConfigurationId = TOPOLOGY_CONFIG_DEFAULT;
    }
  }

  const hardwareProfileState = getField(wizardState, 'hardwareProfileConfig');
  if (isRecord(hardwareProfileState) && isRecord(hardwareProfileState.formData)) {
    const profileName = getConfigName(hardwareProfileState.formData.selectedProfile);
    if (profileName) {
      properties.hardwareProfile = profileName;
    }
  }

  const numReplicasState = getField(wizardState, 'numReplicas');
  if (isRecord(numReplicasState)) {
    const replicas = numReplicasState.data;
    if (typeof replicas === 'number' && Number.isFinite(replicas) && replicas >= 0) {
      properties.replicaCount = replicas;
    }
  }

  const accelerator = getField(wizardState, ACCELERATOR_CONFIG_FIELD_ID);
  if (isRecord(accelerator)) {
    if (accelerator.selectedConfig === ACCELERATOR_CONFIG_DEFAULT) {
      properties.acceleratorConfigurationId = 'default';
    } else {
      const configName = getConfigName(accelerator.selectedConfig);
      if (configName) {
        properties.acceleratorConfigurationId = configName;
      } else if (typeof accelerator.configRef === 'string' && accelerator.configRef.length > 0) {
        properties.acceleratorConfigurationId = accelerator.configRef;
      }
    }
  }

  const routing = getField(wizardState, LLMD_ROUTING_FIELD_ID);
  if (isRecord(routing)) {
    const configName = getConfigName(routing.selectedConfig);
    if (configName) {
      properties.routingConfigurationId = configName;
    } else if (typeof routing.configRef === 'string' && routing.configRef.length > 0) {
      properties.routingConfigurationId = routing.configRef;
    } else if (routing.selectedConfig === undefined && routing.configRef === undefined) {
      properties.routingConfigurationId = DEFAULT_ROUTING_KEY;
    }
  }

  return properties;
};

/**
 * Platform-specific properties merged into Model Deployed / Model Updated for llm-d.
 * Each field is extracted independently so missing gateway data never suppresses composable
 * properties, and vice versa.
 */
export const getLlmdWizardTrackingProperties = (
  wizardState: WizardFormData['state'],
): TrackingPropertyMap => {
  const properties: TrackingPropertyMap = { ...getComposableTrackingProperties(wizardState) };
  const gatewayFieldData = getField(wizardState, LLMD_GATEWAY_FIELD_ID);
  if (isGatewaySelectFieldData(gatewayFieldData)) {
    Object.assign(properties, getLlmdGatewayTrackingProperties(gatewayFieldData.selections));
  }
  return properties;
};

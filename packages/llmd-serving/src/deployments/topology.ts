import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import {
  TOPOLOGY_TYPE_ANNOTATION,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ROUTING_CONFIG_REF_ANNOTATION,
  TopologyType,
  type LLMdDeployment,
} from '../types';
import type { TopologyTypeFieldData } from '../wizardFields/TopologyTypeField';
import {
  TOPOLOGY_CONFIG_DEFAULT,
  type CustomTopologyConfigFieldData,
} from '../wizardFields/CustomTopologyConfigField';
import type { AdvancedRoutingFieldData } from '../wizardFields/AdvancedRoutingField';

const topologyTypeValues: string[] = Object.values(TopologyType);

// ─── Apply: Topology Type ──────────────────────────────────────────────────────

export const applyTopologyType = (
  deployment: LLMdDeployment,
  fieldData?: TopologyTypeFieldData,
): LLMdDeployment => {
  if (!fieldData) {
    return deployment;
  }
  const result = structuredClone(deployment);
  result.model.metadata.annotations = {
    ...result.model.metadata.annotations,
    [TOPOLOGY_TYPE_ANNOTATION]: fieldData.topologyType,
  };
  return result;
};

// ─── Apply: Custom Topology Config ─────────────────────────────────────────────

export const applyTopologyConfig = (
  deployment: LLMdDeployment,
  fieldData?: CustomTopologyConfigFieldData,
): LLMdDeployment => {
  // If configRef is set but not yet resolved, leave deployment unchanged to avoid data loss
  if (fieldData?.configRef && !fieldData.selectedConfig) {
    return deployment;
  }

  const result = structuredClone(deployment);
  const annotations = { ...result.model.metadata.annotations };

  const prevRef = annotations[TOPOLOGY_CONFIG_REF_ANNOTATION];
  if (prevRef && result.model.spec.baseRefs) {
    result.model.spec.baseRefs = result.model.spec.baseRefs.filter((r) => r.name !== prevRef);
  }
  delete annotations[TOPOLOGY_CONFIG_REF_ANNOTATION];

  const config = fieldData?.selectedConfig;
  if (config && config !== TOPOLOGY_CONFIG_DEFAULT) {
    const configName = config.metadata.name;
    annotations[TOPOLOGY_CONFIG_REF_ANNOTATION] = configName;

    if (!result.model.spec.baseRefs) {
      result.model.spec.baseRefs = [];
    }
    if (!result.model.spec.baseRefs.some((r) => r.name === configName)) {
      result.model.spec.baseRefs.push({ name: configName });
    }
  }

  result.model.metadata.annotations = annotations;
  return result;
};

// ─── Apply: Routing Config ─────────────────────────────────────────────────────

export const applyRoutingConfig = (
  deployment: LLMdDeployment,
  fieldData?: AdvancedRoutingFieldData,
): LLMdDeployment => {
  // If configRef is set but not yet resolved, leave deployment unchanged to avoid data loss
  if (fieldData?.configRef && !fieldData.selectedConfig) {
    return deployment;
  }

  const result = structuredClone(deployment);
  const annotations = { ...result.model.metadata.annotations };

  const prevRef = annotations[ROUTING_CONFIG_REF_ANNOTATION];
  if (prevRef && result.model.spec.baseRefs) {
    result.model.spec.baseRefs = result.model.spec.baseRefs.filter((r) => r.name !== prevRef);
  }
  delete annotations[ROUTING_CONFIG_REF_ANNOTATION];

  const config = fieldData?.selectedConfig;
  if (config) {
    const configName = config.metadata.name;
    annotations[ROUTING_CONFIG_REF_ANNOTATION] = configName;

    if (!result.model.spec.baseRefs) {
      result.model.spec.baseRefs = [];
    }
    if (!result.model.spec.baseRefs.some((r) => r.name === configName)) {
      result.model.spec.baseRefs.push({ name: configName });
    }
  }

  result.model.metadata.annotations = annotations;
  return result;
};

// ─── Extract: Topology Type ────────────────────────────────────────────────────

export const extractTopologyType = (
  deployment: LLMdDeployment,
): TopologyTypeFieldData | undefined => {
  const topologyType = deployment.model.metadata.annotations?.[TOPOLOGY_TYPE_ANNOTATION];
  if (!topologyType || !topologyTypeValues.includes(topologyType)) {
    return undefined;
  }
  return { topologyType };
};

// ─── Extract: Custom Topology Config ───────────────────────────────────────────

export const extractTopologyConfig = (
  deployment: LLMdDeployment,
): CustomTopologyConfigFieldData | undefined => {
  const configRef = deployment.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION];
  if (!configRef) {
    return undefined;
  }
  return { configRef };
};

// ─── Extract: Routing Config ───────────────────────────────────────────────────

export const extractRoutingConfig = (
  deployment: LLMdDeployment,
): AdvancedRoutingFieldData | undefined => {
  const configRef = deployment.model.metadata.annotations?.[ROUTING_CONFIG_REF_ANNOTATION];
  if (!configRef) {
    return undefined;
  }
  return { configRef };
};

// ─── Unused-import guard for WizardFormData (required by apply extension sig) ─

export type TopologyApplyFn = (
  deployment: LLMdDeployment,
  fieldData: TopologyTypeFieldData,
  wizardState: WizardFormData['state'],
) => LLMdDeployment;

export type TopologyConfigApplyFn = (
  deployment: LLMdDeployment,
  fieldData: CustomTopologyConfigFieldData,
  wizardState: WizardFormData['state'],
) => LLMdDeployment;

export type RoutingConfigApplyFn = (
  deployment: LLMdDeployment,
  fieldData: AdvancedRoutingFieldData,
  wizardState: WizardFormData['state'],
) => LLMdDeployment;

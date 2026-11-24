import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { DeploymentHookPayloadFor } from '@odh-dashboard/model-serving/extension-points';
import { applyConfigRef, createLocalConfigName, preDeployConfigCopy } from './configs';
import { TOPOLOGY_CONFIG_DEFAULT } from '../const';
import {
  TOPOLOGY_TYPE_ANNOTATION,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ROUTING_CONFIG_REF_ANNOTATION,
  TopologyType,
  type LLMdDeployment,
  type TopologyTypeFieldData,
} from '../types';
import type { CustomTopologyConfigFieldData } from '../wizardFields/CustomTopologyConfigField';
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
): LLMdDeployment =>
  applyConfigRef(deployment, fieldData, {
    annotationKey: TOPOLOGY_CONFIG_REF_ANNOTATION,
    configName: createLocalConfigName,
    isDefaultPlaceholder: (c) => c === TOPOLOGY_CONFIG_DEFAULT,
  });

// ─── PreDeploy: Topology Config ────────────────────────────────────────────────

export const preDeployTopologyConfig = (
  fieldData: CustomTopologyConfigFieldData,
  wizardState: WizardFormData['state'],
  deployment: DeploymentHookPayloadFor<LLMdDeployment>,
  existingDeployment?: LLMdDeployment,
  dryRun?: boolean,
): Promise<DeploymentHookPayloadFor<LLMdDeployment>> =>
  preDeployConfigCopy(
    {
      annotationKey: TOPOLOGY_CONFIG_REF_ANNOTATION,
      isDefaultPlaceholder: (c) => c === TOPOLOGY_CONFIG_DEFAULT,
    },
    fieldData,
    deployment,
    existingDeployment,
    dryRun,
  );

// ─── PreDeploy: Routing Config ────────────────────────────────────────────────

export const preDeployRoutingConfig = (
  fieldData: AdvancedRoutingFieldData,
  wizardState: WizardFormData['state'],
  deployment: DeploymentHookPayloadFor<LLMdDeployment>,
  existingDeployment?: LLMdDeployment,
  dryRun?: boolean,
): Promise<DeploymentHookPayloadFor<LLMdDeployment>> =>
  preDeployConfigCopy(
    {
      annotationKey: ROUTING_CONFIG_REF_ANNOTATION,
    },
    fieldData,
    deployment,
    existingDeployment,
    dryRun,
  );

// ─── Apply: Routing Config ─────────────────────────────────────────────────────

export const applyRoutingConfig = (
  deployment: LLMdDeployment,
  fieldData?: AdvancedRoutingFieldData,
): LLMdDeployment => {
  const result = applyConfigRef(deployment, fieldData, {
    annotationKey: ROUTING_CONFIG_REF_ANNOTATION,
    configName: createLocalConfigName,
  });
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

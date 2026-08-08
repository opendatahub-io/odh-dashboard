import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '@odh-dashboard/k8s-core';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import {
  CONFIG_TYPE_LABEL,
  TOPOLOGY_TYPE_ANNOTATION,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ROUTING_CONFIG_REF_ANNOTATION,
  TopologyType,
  type LLMdDeployment,
  LLMInferenceServiceConfigKind,
} from '../types';
import type { TopologyTypeFieldData } from '../wizardFields/TopologyTypeField';
import {
  TOPOLOGY_CONFIG_DEFAULT,
  type CustomTopologyConfigFieldData,
} from '../wizardFields/CustomTopologyConfigField';
import type { AdvancedRoutingFieldData } from '../wizardFields/AdvancedRoutingField';
import {
  createLLMInferenceServiceConfig,
  deleteLLMInferenceServiceConfig,
} from '../api/LLMInferenceServiceConfigs';
import { cleanlyDuplicateConfig } from '../utils';

const topologyTypeValues: string[] = Object.values(TopologyType);

/** K8s DNS subdomain limit for resource names */
const MAX_K8S_NAME_LENGTH = 253;

const createLocalConfigName = (
  deployment: LLMdDeployment,
  config: LLMInferenceServiceConfigKind,
) => {
  const prefix = `${deployment.model.metadata.name}-`;
  if (config.metadata.name.startsWith(prefix)) {
    return config.metadata.name;
  }
  // Truncate the config portion so the prefixed name stays creatable; a trailing hyphen left
  // behind by the cut is not a valid k8s name, so strip it
  return `${prefix}${config.metadata.name}`.slice(0, MAX_K8S_NAME_LENGTH).replace(/-+$/, '');
};

const createLocalConfigMetadata = (
  config: LLMInferenceServiceConfigKind,
): { annotations: Record<string, string>; labels: Record<string, string> } => {
  const configType = config.metadata.labels?.[CONFIG_TYPE_LABEL];
  return {
    annotations: {
      'openshift.io/display-name': `${getDisplayNameFromK8sResource(config)} (Local Copy)`,
      'openshift.io/description': getDescriptionFromK8sResource(config),
    },
    labels: {
      ...(configType && { [CONFIG_TYPE_LABEL]: configType }),
    },
  };
};

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
    const configName = createLocalConfigName(deployment, config);
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

// ─── PreDeploy: Topology Config ────────────────────────────────────────────────

export const preDeployTopologyConfig = async (
  fieldData: CustomTopologyConfigFieldData,
  wizardState: WizardFormData['state'],
  deployment: LLMdDeployment,
  existingDeployment?: LLMdDeployment,
  dryRun?: boolean,
): Promise<LLMdDeployment> => {
  const { namespace } = deployment.model.metadata;

  const prevTopologyConfigName =
    existingDeployment?.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION];
  const newTopologyConfigName =
    deployment.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION];

  // clean up old topology config if switching to new one
  if (prevTopologyConfigName && prevTopologyConfigName !== newTopologyConfigName) {
    await deleteLLMInferenceServiceConfig(prevTopologyConfigName, namespace, { dryRun }).catch(
      (e: unknown) => {
        // Don't block if not found. It could be in the global namespace by accident
        if (getGenericErrorCode(e) !== 404) {
          throw e;
        }
      },
    );
  }

  // create new topology config
  if (
    fieldData.selectedConfig &&
    newTopologyConfigName &&
    fieldData.selectedConfig !== TOPOLOGY_CONFIG_DEFAULT
  ) {
    const config = cleanlyDuplicateConfig(fieldData.selectedConfig, {
      name: newTopologyConfigName,
      namespace,
      ...createLocalConfigMetadata(fieldData.selectedConfig),
    });

    await createLLMInferenceServiceConfig(config, { dryRun }).catch((e: unknown) => {
      // Don't block if it already exists
      if (getGenericErrorCode(e) !== 409) {
        throw e;
      }
    });
  }

  return deployment;
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

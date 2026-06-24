import type { K8sModelCommon, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  MetadataAnnotation,
  type DisplayNameAnnotations,
  type PodContainer,
} from '@odh-dashboard/k8s-core';
import type { ImagePullSecret } from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { LLMD_SERVING_ID } from '../extensions/extensions';

export const MAAS_ENDPOINT_LABEL = 'opendatahub.io/maas-endpoint';

// --- Topology and Routing Config Enums ---

export enum TopologyType {
  SINGLE_NODE = 'workload-single-node',
  MULTI_NODE = 'workload-multi-node-data-parallel',
  SINGLE_NODE_DISAGGREGATED = 'workload-single-node-pd',
  MULTI_NODE_DISAGGREGATED = 'workload-multi-node-data-parallel-pd',
}

export const TopologyTypeLabels: Record<TopologyType, string> = {
  [TopologyType.SINGLE_NODE]: 'Single node',
  [TopologyType.MULTI_NODE]: 'Multi-node',
  [TopologyType.SINGLE_NODE_DISAGGREGATED]: 'Single node disaggregated',
  [TopologyType.MULTI_NODE_DISAGGREGATED]: 'Multi-node disaggregated',
};

export enum RoutingType {
  SCHEDULER = 'scheduler',
  HTTP_ROUTE = 'http-route',
  SCHEDULER_AND_HTTP_ROUTE = 'scheduler-and-http-route',
}

export const RoutingTypeLabels: Record<RoutingType, string> = {
  [RoutingType.SCHEDULER]: 'Scheduler',
  [RoutingType.HTTP_ROUTE]: 'HTTPRoute',
  [RoutingType.SCHEDULER_AND_HTTP_ROUTE]: 'Scheduler + HTTPRoute',
};

// --- Label/Annotation Constants (dashboard-owned, abstracted for easy refactor) ---

export const CONFIG_TYPE_LABEL = 'opendatahub.io/config-type';
export const CONFIG_TYPE_ROUTER = 'router';
const WELL_KNOWN_ANNOTATION = 'serving.kserve.io/well-known-config';
const DISABLED_ANNOTATION = 'opendatahub.io/disabled';
const ROUTING_TYPE_ANNOTATION = 'opendatahub.io/routing-type';
const SUPPORTED_TOPOLOGIES_ANNOTATION = 'opendatahub.io/supported-topologies';
export const DASHBOARD_RESOURCE_LABEL = 'opendatahub.io/dashboard';

export type LLMdContainer = { name: string; args?: string[] } & Partial<PodContainer>;

// Shared by both LLMInferenceService and LLMInferenceServiceConfig
// https://kserve.github.io/website/docs/reference/crd-api#llminferenceservice
type LLMInferenceServiceSpec = {
  baseRefs?: {
    name?: string;
  }[];
  model: {
    uri: string;
    name?: string;
  };
  replicas?: number;
  router?: {
    gateway?: {
      refs?: {
        name?: string;
        namespace?: string;
      }[];
    };
    route?: object;
    scheduler?: object;
  };
  template?: {
    containers?: LLMdContainer[];
    imagePullSecrets?: ImagePullSecret[];
  };
};

export const VLLM_ADDITIONAL_ARGS = 'VLLM_ADDITIONAL_ARGS';

export type LLMInferenceServiceKind = K8sResourceCommon & {
  kind: 'LLMInferenceService';
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations & {
      [MetadataAnnotation.ConnectionName]?: string;
    } & {
      'opendatahub.io/model-type'?: 'generative';
      'opendatahub.io/genai-use-case'?: string;
    };
    labels?: {
      'opendatahub.io/genai-asset'?: 'true' | 'false';
      [MAAS_ENDPOINT_LABEL]?: 'true';
    };
  };
  spec: LLMInferenceServiceSpec;
  status?: {
    conditions?: {
      lastTransitionTime?: string;
      message?: string;
      reason?: string;
      severity?: string;
      status?: string;
      type?: string;
    }[];
    url?: string;
    addresses?: { name?: string; url?: string }[];
    observedGeneration?: number;
  };
};
export const isLLMInferenceService = (
  resource?: K8sResourceCommon,
): resource is LLMInferenceServiceKind => resource?.kind === 'LLMInferenceService';

export type LLMInferenceServiceConfigKind = K8sResourceCommon & {
  kind: 'LLMInferenceServiceConfig';
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations & {
      'opendatahub.io/recommended-accelerators'?: string;
      'opendatahub.io/runtime-version'?: string;
      'opendatahub.io/template-name'?: string;
      'opendatahub.io/disabled'?: 'true' | 'false';
      'opendatahub.io/routing-type'?: RoutingType;
      'opendatahub.io/supported-topologies'?: string;
      'serving.kserve.io/well-known-config'?: 'true' | 'false';
    };
    labels?: {
      'opendatahub.io/config-type'?: TopologyType | 'router' | 'accelerator';
      'opendatahub.io/dashboard'?: 'true' | 'false';
    };
  };
  spec?: LLMInferenceServiceSpec;
};
export const isLLMInferenceServiceConfig = (
  resource?: K8sResourceCommon,
): resource is LLMInferenceServiceConfigKind => resource?.kind === 'LLMInferenceServiceConfig';

export type LLMdDeployment = Deployment<LLMInferenceServiceKind, LLMInferenceServiceConfigKind>;

export const isLLMdDeployment = (deployment: Deployment): deployment is LLMdDeployment =>
  deployment.modelServingPlatformId === LLMD_SERVING_ID;

export const LLMInferenceServiceModel: K8sModelCommon = {
  apiVersion: 'v1alpha2',
  apiGroup: 'serving.kserve.io',
  kind: 'LLMInferenceService',
  plural: 'llminferenceservices',
};

export const LLMInferenceServiceConfigModel: K8sModelCommon = {
  apiVersion: 'v1alpha2',
  apiGroup: 'serving.kserve.io',
  kind: 'LLMInferenceServiceConfig',
  plural: 'llminferenceserviceconfigs',
};

export enum LLMInferenceServiceReadyConditionReason {
  PROGRESS_DEADLINE_EXCEEDED = 'ProgressDeadlineExceeded',
  STOPPED = 'Stopped',
  MINIMUM_REPLICAS_UNAVAILABLE = 'MinimumReplicasUnavailable',
  PROGRESSING = 'Progressing',
}

// --- Config Type Helpers (abstracted so label names can be updated in one place) ---

const topologyTypeValues: string[] = Object.values(TopologyType);
const isTopologyTypeValue = (value: string): value is TopologyType =>
  topologyTypeValues.includes(value);

const routingTypeValues: string[] = Object.values(RoutingType);
const isRoutingTypeValue = (value: string): value is RoutingType =>
  routingTypeValues.includes(value);

export const isTopologyConfig = (config: LLMInferenceServiceConfigKind): boolean => {
  const configType = config.metadata.labels?.[CONFIG_TYPE_LABEL];
  return !!configType && isTopologyTypeValue(configType);
};

export const isRouterConfig = (config: LLMInferenceServiceConfigKind): boolean =>
  config.metadata.labels?.[CONFIG_TYPE_LABEL] === CONFIG_TYPE_ROUTER;

export const getConfigTopologyType = (
  config: LLMInferenceServiceConfigKind,
): TopologyType | undefined => {
  const configType = config.metadata.labels?.[CONFIG_TYPE_LABEL];
  if (configType && isTopologyTypeValue(configType)) {
    return configType;
  }
  return undefined;
};

export const getConfigRoutingType = (
  config: LLMInferenceServiceConfigKind,
): RoutingType | undefined => {
  const value = config.metadata.annotations?.[ROUTING_TYPE_ANNOTATION];
  if (value && isRoutingTypeValue(value)) {
    return value;
  }
  return undefined;
};

export const getConfigSupportedTopologies = (
  config: LLMInferenceServiceConfigKind,
): TopologyType[] => {
  const raw = config.metadata.annotations?.[SUPPORTED_TOPOLOGIES_ANNOTATION];
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((t): t is TopologyType => typeof t === 'string' && isTopologyTypeValue(t));
  } catch {
    return [];
  }
};

const hasKserveOwnership = (resource: K8sResourceCommon): boolean =>
  resource.metadata?.ownerReferences?.some(
    (ref) => ref.kind === 'KServe' || ref.apiVersion.startsWith('operator.kserve.io/'),
  ) ?? false;

export const isConfigPreInstalled = (config: LLMInferenceServiceConfigKind): boolean => {
  const hasWellKnownAnnotation = config.metadata.annotations?.[WELL_KNOWN_ANNOTATION] === 'true';
  const hasKserveOwnerRef = hasKserveOwnership(config);
  const hasDashboardLabel = config.metadata.labels?.[DASHBOARD_RESOURCE_LABEL] === 'true';

  return (hasWellKnownAnnotation || hasKserveOwnerRef) && !hasDashboardLabel;
};

export const isConfigEnabled = (config: LLMInferenceServiceConfigKind): boolean =>
  config.metadata.annotations?.[DISABLED_ANNOTATION] !== 'true';

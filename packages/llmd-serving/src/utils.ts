import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { isUnsupportedUnaccepted } from '@odh-dashboard/model-serving/concepts/versions';
import {
  WELL_KNOWN_ANNOTATION,
  DISABLED_ANNOTATION,
  DASHBOARD_RESOURCE_LABEL,
  ROUTING_CONFIG_REF_ANNOTATION,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
} from './const';
import type { LLMInferenceServiceConfigKind, LLMInferenceServiceKind } from './types';

export const CONFIG_IN_USE_ERROR_MESSAGE =
  'This configuration is currently in use by a deployment. Remove the deployment before deleting this configuration.';

export const CONFIG_DELETION_PENDING_MESSAGE =
  'This configuration is in use by a deployment. It will remain in a terminating state until that deployment is removed.';

export const isConfigObject = (value: unknown): value is LLMInferenceServiceConfigKind =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'metadata' in value &&
  typeof value.metadata === 'object' &&
  value.metadata !== null;

export const cleanResourceForYAMLViewer = (
  metadata: LLMInferenceServiceConfigKind['metadata'],
): Omit<
  LLMInferenceServiceConfigKind['metadata'],
  | 'resourceVersion'
  | 'uid'
  | 'creationTimestamp'
  | 'generation'
  | 'managedFields'
  | 'ownerReferences'
> => {
  const result = { ...metadata };
  delete result.resourceVersion;
  delete result.uid;
  delete result.creationTimestamp;
  delete result.generation;
  delete result.managedFields;
  delete result.ownerReferences;
  return result;
};

export const stripDuplicatingAnnotations = (
  annotations: Record<string, string> | undefined,
): Record<string, string> | undefined => {
  if (!annotations) {
    return annotations;
  }
  const result = { ...annotations };
  delete result['kubectl.kubernetes.io/last-applied-configuration'];
  delete result['serving.kserve.io/well-known-config'];
  delete result['platform.opendatahub.io/instance.name'];
  delete result['platform.opendatahub.io/instance.uid'];
  delete result['platform.opendatahub.io/instance.generation'];
  delete result['internal.config.kubernetes.io/previousNamespaces'];
  delete result['internal.config.kubernetes.io/previousKinds'];
  delete result['internal.config.kubernetes.io/previousNames'];
  return result;
};

export const stripDuplicatingLabels = (
  labels: Record<string, string> | undefined,
): Record<string, string> | undefined => {
  if (!labels) {
    return labels;
  }
  const result = { ...labels };
  delete result['platform.opendatahub.io/part-of'];
  delete result['app.kubernetes.io/part-of'];
  delete result['app.opendatahub.io/kserve'];
  return result;
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

export const isConfigEffectivelyEnabled = (config: LLMInferenceServiceConfigKind): boolean =>
  isUnsupportedUnaccepted(config) ? false : isConfigEnabled(config);

export const cleanlyDuplicateConfig = (
  existingConfig: LLMInferenceServiceConfigKind,
  metadata: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  },
): LLMInferenceServiceConfigKind => {
  const duplicatedConfig = structuredClone(existingConfig);

  return {
    ...duplicatedConfig,
    metadata: {
      // Exclude other metadata to exclude existing resource version stuff
      name: metadata.name || duplicatedConfig.metadata.name,
      namespace: metadata.namespace || duplicatedConfig.metadata.namespace,
      ...(metadata.annotations && { annotations: metadata.annotations }),
      ...(metadata.labels && { labels: metadata.labels }),
    },
  };
};

const KSERVE_CONFIG_FINALIZER = 'serving.kserve.io/llmisvcconfig-finalizer';

export const isDeletionBlockedByFinalizer = (result: unknown): boolean =>
  isConfigObject(result) &&
  !!result.metadata.deletionTimestamp &&
  !!result.metadata.finalizers?.includes(KSERVE_CONFIG_FINALIZER);

export type LlmConfigRefType = 'routing' | 'topology';

const getConfigRefAnnotation = (refType: LlmConfigRefType) =>
  refType === 'routing' ? ROUTING_CONFIG_REF_ANNOTATION : TOPOLOGY_CONFIG_REF_ANNOTATION;

const MAX_K8S_NAME_LENGTH = 253;

const getLocalTopologyConfigName = (deploymentName: string, configName: string): string => {
  const prefix = `${deploymentName}-`;
  if (configName.startsWith(prefix)) {
    return configName;
  }
  return `${prefix}${configName}`.slice(0, MAX_K8S_NAME_LENGTH).replace(/-+$/, '');
};

export const isConfigReferencedInStatus = (config: LLMInferenceServiceConfigKind): boolean =>
  (config.status?.referencedBy?.length ?? 0) > 0;

export const isConfigInUse = (
  config: LLMInferenceServiceConfigKind,
  deployments: LLMInferenceServiceKind[] | null,
  configName: string,
  refType: LlmConfigRefType,
): boolean => {
  if (deployments) {
    return getDeploymentsReferencingConfig(deployments, configName, refType).length > 0;
  }

  return isConfigReferencedInStatus(config);
};

export const isDeletionPendingDueToReferences = (
  result: unknown,
  deployments: LLMInferenceServiceKind[] | null,
  configName: string,
  refType: LlmConfigRefType,
): boolean =>
  isDeletionBlockedByFinalizer(result) &&
  isConfigObject(result) &&
  isConfigInUse(result, deployments, configName, refType);

export const isDeploymentReferencingConfig = (
  deployment: LLMInferenceServiceKind,
  configName: string,
  refType: LlmConfigRefType,
): boolean => {
  const annotationRef = deployment.metadata.annotations?.[getConfigRefAnnotation(refType)];
  if (annotationRef === configName) {
    return true;
  }

  if (
    refType === 'topology' &&
    annotationRef === getLocalTopologyConfigName(deployment.metadata.name, configName)
  ) {
    return true;
  }

  if (deployment.spec.baseRefs?.some((ref) => ref.name === configName)) {
    return true;
  }

  if (
    refType === 'topology' &&
    deployment.spec.baseRefs?.some(
      (ref) => ref.name === getLocalTopologyConfigName(deployment.metadata.name, configName),
    )
  ) {
    return true;
  }

  return false;
};

export const getDeploymentsReferencingConfig = (
  deployments: LLMInferenceServiceKind[],
  configName: string,
  refType: LlmConfigRefType,
): LLMInferenceServiceKind[] =>
  deployments.filter((deployment) =>
    isDeploymentReferencingConfig(deployment, configName, refType),
  );

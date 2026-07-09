import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { WELL_KNOWN_ANNOTATION, DISABLED_ANNOTATION, DASHBOARD_RESOURCE_LABEL } from './const';
import type { LLMInferenceServiceConfigKind } from './types';

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

export const stripAnnotation = (
  annotations: Record<string, string> | undefined,
  key: string,
): Record<string, string> | undefined => {
  if (!annotations) {
    return annotations;
  }
  const result = { ...annotations };
  delete result[key];
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

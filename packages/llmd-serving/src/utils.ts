import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { WELL_KNOWN_ANNOTATION, DISABLED_ANNOTATION, DASHBOARD_RESOURCE_LABEL } from './const';
import type { LLMInferenceServiceConfigKind } from './types';

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

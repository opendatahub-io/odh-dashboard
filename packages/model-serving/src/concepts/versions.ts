import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { TemplateKind } from '@odh-dashboard/k8s-core';

// Annotation constants

export const SUPPORT_STATUS_ANNOTATION = 'opendatahub.io/support-status';
export const UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION = 'opendatahub.io/unsupported-status-accepted';
export const SUPPORT_STATUS_UNSUPPORTED = 'unsupported';
export const RUNTIME_VERSION_ANNOTATION = 'opendatahub.io/runtime-version';
export const FAST_VERSION_ANNOTATION = 'opendatahub.io/fast-version';

const isTemplateKind = (resource: K8sResourceCommon): resource is TemplateKind =>
  resource.kind === 'Template';

// For Templates, the backend puts annotations on both the outer Template and the inner
// ServingRuntime (objects[0]). This helper checks inner first, then falls back to outer.
// It is compatible with other resources like LLMInferenceServiceConfigs that use only an outer resource.
const getInnerAnnotation = (resource: K8sResourceCommon, annotation: string): string | undefined =>
  (isTemplateKind(resource)
    ? // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- objects may be missing at runtime
      resource.objects?.[0]?.metadata.annotations?.[annotation]
    : undefined) ?? resource.metadata?.annotations?.[annotation];

// Support status utils

export const isUnsupportedResource = (resource: K8sResourceCommon): boolean =>
  getInnerAnnotation(resource, SUPPORT_STATUS_ANNOTATION) === SUPPORT_STATUS_UNSUPPORTED;

export const isUnsupportedAccepted = (resource: K8sResourceCommon): boolean =>
  isUnsupportedResource(resource) &&
  getInnerAnnotation(resource, UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION) === 'true';

export const isUnsupportedUnaccepted = (resource: K8sResourceCommon): boolean =>
  isUnsupportedResource(resource) && !isUnsupportedAccepted(resource);

// Version utils

export const getServingRuntimeVersion = (
  resource: K8sResourceCommon | undefined,
): string | undefined =>
  resource ? getInnerAnnotation(resource, RUNTIME_VERSION_ANNOTATION) : undefined;

export const getFastVersion = (resource: K8sResourceCommon | undefined): string | undefined =>
  resource ? getInnerAnnotation(resource, FAST_VERSION_ANNOTATION) : undefined;

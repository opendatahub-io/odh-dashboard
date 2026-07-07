import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const SUPPORT_STATUS_ANNOTATION = 'opendatahub.io/support-status';
export const UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION = 'opendatahub.io/unsupported-status-accepted';
export const SUPPORT_STATUS_UNSUPPORTED = 'unsupported';

export const isUnsupportedResource = (resource: K8sResourceCommon): boolean =>
  resource.metadata?.annotations?.[SUPPORT_STATUS_ANNOTATION] === SUPPORT_STATUS_UNSUPPORTED;

export const isUnsupportedAccepted = (resource: K8sResourceCommon): boolean =>
  isUnsupportedResource(resource) &&
  resource.metadata?.annotations?.[UNSUPPORTED_STATUS_ACCEPTED_ANNOTATION] === 'true';

export const isUnsupportedUnaccepted = (resource: K8sResourceCommon): boolean =>
  isUnsupportedResource(resource) && !isUnsupportedAccepted(resource);

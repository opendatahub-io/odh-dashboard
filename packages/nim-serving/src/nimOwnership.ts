import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

/**
 * Check if a K8s resource (typically InferenceService) is owned by a NIMService
 * by inspecting its ownerReferences. The NIM Operator sets controller ownerReferences
 * on the InferenceService it creates for each NIMService.
 */
export const isNIMOwned = (resource: K8sResourceCommon): boolean =>
  resource.metadata?.ownerReferences?.some(
    (ref) => ref.kind === 'NIMService' && ref.apiVersion.startsWith('apps.nvidia.com/'),
  ) ?? false;

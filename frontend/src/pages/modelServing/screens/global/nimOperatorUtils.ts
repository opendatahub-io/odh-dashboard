import { InferenceServiceKind } from '#~/k8sTypes';

/**
 * Utility functions for working with NIM Operator managed resources
 */

/**
 * Check if an InferenceService is managed by a NIMService CR (NIM Operator)
 * by looking at its ownerReferences.
 *
 * When the NIM Operator creates an InferenceService from a NIMService CR,
 * it sets an ownerReference pointing to the NIMService.
 *
 * @param inferenceService - The InferenceService to check
 * @returns Object with NIMService name and UID if found, undefined otherwise
 */
export const getNIMServiceOwner = (
  inferenceService: InferenceServiceKind,
): { name: string; uid: string } | undefined => {
  const nimServiceOwner = inferenceService.metadata.ownerReferences?.find(
    (ref) =>
      ref.kind === 'NIMService' &&
      (ref.apiVersion === 'apps.nvidia.com/v1alpha1' ||
        ref.apiVersion.startsWith('apps.nvidia.com/')),
  );

  if (nimServiceOwner && nimServiceOwner.name) {
    return {
      name: nimServiceOwner.name,
      uid: nimServiceOwner.uid || '',
    };
  }

  return undefined;
};

/**
 * Check if an InferenceService is managed by the NIM Operator
 *
 * @param inferenceService - The InferenceService to check
 * @returns true if managed by NIM Operator, false otherwise
 */
export const isNIMOperatorManaged = (inferenceService: InferenceServiceKind): boolean =>
  !!getNIMServiceOwner(inferenceService);

import type { InferenceServiceKind, K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import {
  k8sCreateResource,
  k8sPatchResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/models/index';
import { createPatchesFromDiff } from '@odh-dashboard/internal/api/k8sUtils';

export const createInferenceService = (
  inferenceService: InferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind> => {
  return k8sCreateResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        resource: inferenceService,
      },
      opts,
    ),
  );
};

export const updateInferenceService = (
  inferenceService: InferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind> => {
  return k8sUpdateResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        resource: inferenceService,
      },
      opts,
    ),
  );
};

/**
 * Updates an InferenceService using JSON Patch operations.
 * This approach is more efficient and less prone to conflicts than full resource updates.
 *
 * @param existingInferenceService - The existing InferenceService to update
 * @param newInferenceService - The new InferenceService to update
 * @param opts - The options for the patch operation
 * @returns Promise resolving to the updated InferenceService
 */
export const patchInferenceService = (
  existingInferenceService: InferenceServiceKind,
  newInferenceService: InferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind> => {
  // Generate patches based on the differences
  // Managed fields like status, resourceVersion, etc. are automatically filtered out
  const patches = createPatchesFromDiff(existingInferenceService, newInferenceService);

  // If no patches needed, return the existing resource
  if (patches.length === 0) {
    return Promise.resolve(newInferenceService);
  }

  return k8sPatchResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        queryOptions: {
          name: newInferenceService.metadata.name,
          ns: newInferenceService.metadata.namespace,
        },
        patches,
      },
      opts,
    ),
  );
};

import type { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import {
  k8sCreateResource,
  k8sPatchResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { createPatchesFromDiff } from '@odh-dashboard/internal/api/k8sUtils';
import { LLMInferenceServiceKind, LLMInferenceServiceModel } from '../types';

export const createLLMInferenceService = (
  llmInferenceService: LLMInferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<LLMInferenceServiceKind> => {
  return k8sCreateResource<LLMInferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceModel,
        resource: llmInferenceService,
      },
      opts,
    ),
  );
};

export const updateLLMInferenceService = (
  llmInferenceService: LLMInferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<LLMInferenceServiceKind> => {
  return k8sUpdateResource<LLMInferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceModel,
        resource: llmInferenceService,
      },
      opts,
    ),
  );
};

/**
 * Updates an LLMInferenceService using JSON Patch operations.
 * This approach is more efficient and less prone to conflicts than full resource updates.
 *
 * @param existingLLMInferenceService - The existing LLMInferenceService to update
 * @param newLLMInferenceService - The new LLMInferenceService to update
 * @param opts - The options for the patch operation
 * @returns Promise resolving to the updated LLMInferenceService
 */
export const patchLLMInferenceService = (
  existingLLMInferenceService: LLMInferenceServiceKind,
  newLLMInferenceService: LLMInferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<LLMInferenceServiceKind> => {
  // Generate patches based on the differences
  // Managed fields like status, resourceVersion, etc. are automatically filtered out
  const patches = createPatchesFromDiff(existingLLMInferenceService, newLLMInferenceService);

  // If no patches needed, return the existing resource
  if (patches.length === 0) {
    return Promise.resolve(newLLMInferenceService);
  }

  return k8sPatchResource<LLMInferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: LLMInferenceServiceModel,
        queryOptions: {
          name: newLLMInferenceService.metadata.name,
          ns: newLLMInferenceService.metadata.namespace,
        },
        patches,
      },
      opts,
    ),
  );
};

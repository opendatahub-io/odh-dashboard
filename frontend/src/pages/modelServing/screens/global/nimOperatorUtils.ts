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

/**
 * Extract the model name from a NVIDIA NIM container image path.
 *
 * NIM container images follow the pattern: nvcr.io/nim/{vendor}/{model-name}:{tag}
 *
 * Examples:
 * - "nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.5" → "llama-3.1-8b-instruct"
 * - "nvcr.io/nim/nvidia/mistral-7b-instruct-v0.3:24.08" → "mistral-7b-instruct-v0.3"
 *
 * @param imagePath - The full container image path
 * @returns The model name if found, undefined otherwise
 */
export const extractModelNameFromNIMImage = (imagePath: string): string | undefined => {
  if (!imagePath || !imagePath.includes('/nim/')) {
    return undefined;
  }

  try {
    // Extract the part after /nim/
    // "nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.5" → "meta/llama-3.1-8b-instruct:1.8.5"
    const afterNim = imagePath.split('/nim/')[1];
    if (!afterNim) {
      return undefined;
    }

    // Split by / to get the path components
    // "meta/llama-3.1-8b-instruct:1.8.5" → ["meta", "llama-3.1-8b-instruct:1.8.5"]
    const parts = afterNim.split('/');
    if (parts.length < 2) {
      return undefined;
    }

    // Get the last part which contains model-name:tag
    const modelPart = parts[parts.length - 1];

    // Split by : to separate name and tag, take only the name
    // "llama-3.1-8b-instruct:1.8.5" → "llama-3.1-8b-instruct"
    const modelName = modelPart.split(':')[0];

    return modelName || undefined;
  } catch (e) {
    return undefined;
  }
};

/**
 * Get the model name (framework) from a NIM Operator-managed InferenceService.
 *
 * Extracts the model name from the first container's image path in the predictor spec.
 *
 * @param inferenceService - The InferenceService to extract the model name from
 * @returns The model name if found, undefined otherwise
 */
export const getModelNameFromNIMInferenceService = (
  inferenceService: InferenceServiceKind,
): string | undefined => {
  // Type guard: NIM Operator uses containers instead of model spec
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
  const predictor = inferenceService.spec.predictor as any;
  const containers = predictor?.containers;

  if (!containers || !Array.isArray(containers) || containers.length === 0) {
    return undefined;
  }

  const image = containers[0]?.image;
  if (!image) {
    return undefined;
  }

  return extractModelNameFromNIMImage(image);
};

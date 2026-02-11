import React from 'react';
import { InferenceServiceKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getNIMService } from '#~/api';

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
 * Get the NIMService name that owns this InferenceService
 *
 * @param inferenceService - The InferenceService to check
 * @returns The NIMService name if found, undefined otherwise
 */
export const getNIMServiceName = (inferenceService: InferenceServiceKind): string | undefined =>
  getNIMServiceOwner(inferenceService)?.name;

/**
 * System-managed environment variables that the NIM Operator automatically adds.
 * These should be filtered out when showing user-added environment variables in the edit form.
 */
const NIM_SYSTEM_ENV_VARS = [
  'NIM_CACHE_PATH',
  'NGC_API_KEY',
  'OUTLINES_CACHE_DIR',
  'NIM_SERVER_PORT',
  'NIM_HTTP_API_PORT',
  'NIM_JSONL_LOGGING',
  'NIM_LOG_LEVEL',
];

/**
 * Filter out system-managed environment variables from a NIM Operator InferenceService.
 *
 * The NIM Operator adds several environment variables automatically (NIM_CACHE_PATH,
 * NGC_API_KEY, etc.) that users shouldn't see or edit. This function filters them out
 * to show only user-added variables.
 *
 * @param envVars - Array of environment variables from the InferenceService
 * @returns Filtered array containing only user-added environment variables
 */
export const filterNIMSystemEnvVars = (
  envVars?: Array<{ name: string; value?: string }>,
): Array<{ name: string; value?: string }> => {
  if (!envVars) {
    return [];
  }

  return envVars.filter((envVar) => !NIM_SYSTEM_ENV_VARS.includes(envVar.name));
};

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

/**
 * Get the display name for an InferenceService.
 * For NIM Operator-managed deployments, fetches the display name from the parent NIMService.
 * For regular deployments, uses the InferenceService's own display name annotation.
 *
 * @param inferenceService - The InferenceService to get the display name for
 * @returns Promise that resolves to the display name, or falls back to K8s resource name
 */
export const getInferenceServiceDisplayName = async (
  inferenceService: InferenceServiceKind,
): Promise<string> => {
  // Check if this is NIM Operator-managed
  const nimServiceOwner = getNIMServiceOwner(inferenceService);

  if (nimServiceOwner) {
    // Try to fetch the NIMService to get its display name
    try {
      const nimService = await getNIMService(
        nimServiceOwner.name,
        inferenceService.metadata.namespace,
      );
      return getDisplayNameFromK8sResource(nimService);
    } catch (error) {
      // If we can't fetch the NIMService, fall back to InferenceService name
      // eslint-disable-next-line no-console
      console.warn(
        `Could not fetch NIMService ${nimServiceOwner.name} for display name, using fallback:`,
        error,
      );
    }
  }

  // For non-NIM-Operator deployments, use the InferenceService's own display name
  return getDisplayNameFromK8sResource(inferenceService);
};

/**
 * React hook to get the display name for an InferenceService.
 * For NIM Operator-managed deployments, fetches and returns the display name from the parent NIMService.
 * For regular deployments, returns the InferenceService's own display name annotation.
 *
 * @param inferenceService - The InferenceService to get the display name for
 * @returns The display name, falling back to K8s resource name while loading or on error
 */
export const useInferenceServiceDisplayName = (inferenceService: InferenceServiceKind): string => {
  const fallbackName = getDisplayNameFromK8sResource(inferenceService);
  const [displayName, setDisplayName] = React.useState<string>(fallbackName);

  // Use stable scalar keys instead of the object reference
  const {
    name: resourceName,
    namespace: resourceNamespace,
    resourceVersion,
  } = inferenceService.metadata;

  React.useEffect(() => {
    let stale = false;

    const fetchDisplayName = async () => {
      const name = await getInferenceServiceDisplayName(inferenceService);
      if (!stale) {
        setDisplayName(name);
      }
    };

    fetchDisplayName();

    return () => {
      stale = true;
    };
  }, [resourceName, resourceNamespace, resourceVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  return displayName;
};

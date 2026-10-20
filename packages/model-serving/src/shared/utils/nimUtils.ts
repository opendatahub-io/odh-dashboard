import type { ServingRuntimeKind } from '../types';

export const NIM_RUNTIME_STAMP_ANNOTATION = 'runtimes.opendatahub.io/nvidia-nim';

// This intentionally duplicates isNIMKServeDeployment in nim-serving while NIM metrics
// lives in model-serving. Move and deduplicate this logic in nim-serving if NIM metrics
// is migrated to an extension owned by that package.
export const isNIMServingRuntime = (runtime?: ServingRuntimeKind): boolean => {
  const containers = runtime?.spec.containers;
  const image = Array.isArray(containers)
    ? containers.find((container) => container.name === 'kserve-container')?.image
    : undefined;
  return (
    (typeof image === 'string' && image.startsWith('nvcr.io/nim/')) ||
    !!runtime?.metadata.annotations?.[NIM_RUNTIME_STAMP_ANNOTATION]
  );
};

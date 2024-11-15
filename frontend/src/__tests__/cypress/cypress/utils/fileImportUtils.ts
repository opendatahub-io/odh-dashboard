import * as path from 'path';

// File path constants
export const MODEL_SERVING_PATHS = {
  MULTI_MODEL: {
    OVMS_SERVING_RUNTIME: 'resources/files/modelServing/multiModel/ovms_servingruntime.yaml',
  },
  SINGLE_MODEL: {
    SINGLE_SERVING_KSERVE_RUNTIME:
      'resources/files/modelServing/singleModel/kserve_singleservingruntime.yaml',
  },
};

// Utility function to get fixture path
export function getFixturePath(relativePath: string): string {
  return path.join('cypress/fixtures', relativePath);
}

// Utility functions to get specific file paths
export function getMultiModelPath(): string {
  return getFixturePath(MODEL_SERVING_PATHS.MULTI_MODEL.OVMS_SERVING_RUNTIME);
}

export function getSingleModelPath(): string {
  return getFixturePath(MODEL_SERVING_PATHS.SINGLE_MODEL.SINGLE_SERVING_KSERVE_RUNTIME);
}

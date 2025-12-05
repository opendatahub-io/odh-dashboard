import * as path from 'path';

// File path constants
export const MODEL_SERVING_PATHS = {
  SINGLE_MODEL: {
    SINGLE_SERVING_KSERVE_RUNTIME:
      'resources/modelServing/singleModel/kserve_singleservingruntime.yaml',
    VLLM_CPU_AMD64_RUNTIME: 'resources/modelServing/singleModel/vllm_cpu_amd64_runtime.yaml',
  },
};

export const PIPELINES_PATHS = {
  IRIS_INDEX_URL: 'resources/pipelines/iris_pipeline_pip_index_url_compiled.yaml',
};

// Utility function to get fixture path
export function getFixturePath(relativePath: string): string {
  return path.join('cypress/fixtures', relativePath);
}

export function getSingleModelPath(): string {
  return getFixturePath(MODEL_SERVING_PATHS.SINGLE_MODEL.SINGLE_SERVING_KSERVE_RUNTIME);
}

export function getVllmCpuAmd64RuntimePath(): string {
  return getFixturePath(MODEL_SERVING_PATHS.SINGLE_MODEL.VLLM_CPU_AMD64_RUNTIME);
}

export function getIrisPipelinePath(): string {
  return getFixturePath(PIPELINES_PATHS.IRIS_INDEX_URL);
}

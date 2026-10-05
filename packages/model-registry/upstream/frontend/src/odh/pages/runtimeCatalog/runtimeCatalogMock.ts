import type { ServingRuntimeModelFormat } from '~/odh/types/servingRuntimeCatalogTypes';

// TODO: REMOVE THIS FILE ONCE WE HAVE A BACKEND API TO FETCH RUNTIME CATALOG DETAILS
export type RuntimeDetails = {
  id: string;
  name: string;
  description: string;
  version: string;
  image: string;
  supportedModelFormats?: ServingRuntimeModelFormat[];
  publishedDate?: string;
  servingRuntimeTemplate?: string;
  llmInferenceServiceTemplate?: string;
};

export type RuntimeDisplayDetails = {
  hardware: string;
  certifiedPlatform: string;
};

export const sampleRuntimeDetails: RuntimeDetails = {
  id: 'catalog-vllm-0-6-2',
  name: 'CUDA vLLM 0.6.2',
  description: 'A GPU runtime for vLLM model serving',
  version: '0.6.2',
  image: 'registry.example.com/mock/vllm:0.6.2',
  supportedModelFormats: [{ name: 'safetensors' }, { name: 'huggingface' }],
  publishedDate: '2026-10-01T00:00:00Z',
  servingRuntimeTemplate: JSON.stringify({
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: { name: 'cuda-vllm' },
  }),
  llmInferenceServiceTemplate: JSON.stringify({
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'LLMInferenceServiceConfig',
    metadata: { name: 'cuda-vllm' },
  }),
};

export const sampleRuntimeDisplayDetails: RuntimeDisplayDetails = {
  hardware: 'N/A',
  certifiedPlatform: 'N/A',
};

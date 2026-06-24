import type { DeploymentMethodFieldOverride } from '@odh-dashboard/model-serving/types/form-data';

// Keys

export const SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY = 'llm-inference-service-simple-vllm';
export const LLMD_DEPLOYMENT_METHOD_KEY = 'llm-inference-service-llmd';

// Simple vLLM

const SIMPLE_VLLM_OPTION = {
  key: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY,
  label: 'LLM inference service deployment',
  description:
    'Deploy an LLM using a preconfigured LLMInferenceService and vLLM accelerator configuration.',
};

export const vllmDeploymentMethodOverride: DeploymentMethodFieldOverride = {
  id: 'deploymentMethod',
  type: 'modifier',
  isActive: () => true,
  options: [SIMPLE_VLLM_OPTION],
};

// LLM-d

const LLMD_OPTION = {
  key: LLMD_DEPLOYMENT_METHOD_KEY,
  label: 'LLM inference service deployment with llm-d',
  description:
    'Deploy an LLM using an LLMInferenceService with additional capabilities such as distributed inference, prefill-decode disaggregation and advanced routing.',
};

export const llmdDeploymentMethodOverride: DeploymentMethodFieldOverride = {
  id: 'deploymentMethod',
  type: 'modifier',
  isActive: () => true,
  options: [LLMD_OPTION],
  suggestion: (clusterSettings) => (clusterSettings?.isLLMdDefault ? LLMD_OPTION : undefined),
};

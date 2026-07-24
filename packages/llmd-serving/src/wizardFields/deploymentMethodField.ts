import type { DeploymentMethodFieldOverride } from '@odh-dashboard/model-serving/types/form-data';

// Keys

export const SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY = 'llm-inference-service-simple-vllm';
export const LLMD_DEPLOYMENT_METHOD_KEY = 'llm-inference-service-llmd';

// Simple vLLM

const SIMPLE_VLLM_OPTION = {
  key: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY,
  label: 'LLM inference service',
  description: 'Deploy a large language model using the standard LLM inference service.',
  order: 1,
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
  label: 'LLM inference service with llm-d',
  description:
    'Deploy a large language model with llm-d for additional scheduling and routing capabilities.',
  order: 2,
};

export const llmdDeploymentMethodOverride: DeploymentMethodFieldOverride = {
  id: 'deploymentMethod',
  type: 'modifier',
  isActive: () => true,
  options: [LLMD_OPTION],
  suggestion: (clusterSettings) => (clusterSettings?.isLLMdDefault ? LLMD_OPTION : undefined),
};

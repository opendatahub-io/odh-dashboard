/* eslint-disable camelcase */
import type { AAModelResponse } from '~/app/types';

export const mockMaaSModel = (overrides: Partial<AAModelResponse> = {}): AAModelResponse => ({
  model_name: 'llama-3',
  model_id: 'llama-3',
  display_name: 'Llama 3',
  model_source_type: 'maas',
  model_type: 'llm',
  serving_runtime: 'vllm',
  api_protocol: 'openai',
  version: '1.0',
  usecase: 'Text generation',
  description: 'Shared subscription model',
  status: 'Running',
  endpoints: ['external:https://models.example.com/llama-3/v1'],
  ...overrides,
});

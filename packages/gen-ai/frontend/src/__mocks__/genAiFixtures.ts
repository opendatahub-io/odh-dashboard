/* eslint-disable camelcase */
import { createMockLlamaStackDistribution } from './mockLlamaStackDistribution';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths -- Exported fixtures cannot rely on GenAI's ~ alias.
import type {
  AAModelResponse,
  BackendResponseData,
  LlamaModelResponse,
  LlamaStackDistributionModel,
} from '../app/types';

export interface AAModelsResponse {
  data: AAModelResponse[];
}

/**
 * Mock AAA model that matches the LSD model format
 * IMPORTANT: The model_id must match the EXTRACTED id from splitLlamaModelId()
 *
 * LSD model full id: 'meta-llama/Llama-3.2-3B-Instruct'
 * splitLlamaModelId extracts: 'Llama-3.2-3B-Instruct' (part after '/')
 * AAA model_id must be: 'Llama-3.2-3B-Instruct' (WITHOUT provider prefix)
 */
export const mockAAModel = (overrides?: Partial<AAModelResponse>): AAModelResponse => ({
  model_name: 'Llama-3.2-3B-Instruct',
  // This must match the model name AFTER the '/' in LSD model id
  model_id: 'Llama-3.2-3B-Instruct',
  serving_runtime: 'vllm',
  api_protocol: 'openai',
  version: '1.0.0',
  usecase: 'text-generation',
  description: 'Meta Llama 3.2 3B Instruct model',
  endpoints: ['http://llama-3-2-3b-instruct.test-namespace.svc.cluster.local:8080'],
  // Must be 'Running' for the model to be selectable
  status: 'Running',
  display_name: 'Llama 3.2 3B Instruct',
  model_source_type: 'namespace',
  model_type: 'llm',
  ...overrides,
});

export const mockAAModels = (models?: Partial<AAModelResponse>[]): AAModelsResponse => {
  if (!models || models.length === 0) {
    return {
      data: [mockAAModel()],
    };
  }

  return {
    data: models.map((model) => mockAAModel(model)),
  };
};

export const mockLlamaModel = (
  overrides: Partial<LlamaModelResponse> = {},
): LlamaModelResponse => ({
  id: 'meta-llama/Llama-3.2-3B-Instruct',
  object: 'model',
  created: 1,
  owned_by: 'meta-llama',
  ...overrides,
});

export const mockChatResponse = (
  overrides: Partial<BackendResponseData> = {},
): BackendResponseData => ({
  id: 'test-response',
  model: 'meta-llama/Llama-3.2-3B-Instruct',
  status: 'completed',
  created_at: 1,
  output: [
    {
      id: 'test-message',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'Hello from the test model' }],
    },
  ],
  usage: { input_tokens: 5, output_tokens: 8, total_tokens: 13 },
  ...overrides,
});

export const mockLsdStatus = (
  overrides: Partial<LlamaStackDistributionModel> = {},
): LlamaStackDistributionModel => ({
  ...createMockLlamaStackDistribution(),
  ...overrides,
});

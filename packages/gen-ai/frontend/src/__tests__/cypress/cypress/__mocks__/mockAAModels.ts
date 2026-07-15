/* eslint-disable camelcase */
import type { AAModelResponse } from '~/app/types';

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
  sa_token: {
    name: 'model-sa',
    token_name: 'model-token',
    token: 'test-token-123',
  },
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

/**
 * Mock multiple AI models for testing prompt associated model feature
 * Includes various Llama and Granite models that can be referenced in prompts
 */
export const mockAAModelsForPromptTesting = (): AAModelsResponse => ({
  data: [
    mockAAModel({
      model_name: 'Llama 3.1 70B Instruct',
      model_id: 'meta-llama-3.1-70b-instruct',
      display_name: 'Llama 3.1 70B Instruct',
      description: 'Meta Llama 3.1 70B Instruct model',
    }),
    mockAAModel({
      model_name: 'Llama 3.3 70B Instruct',
      model_id: 'meta-llama-3.3-70b-instruct',
      display_name: 'Llama 3.3 70B Instruct',
      description: 'Meta Llama 3.3 70B Instruct model',
    }),
    mockAAModel({
      model_name: 'Granite 3.1 8B Instruct',
      model_id: 'granite-3.1-8b-instruct',
      display_name: 'Granite 3.1 8B Instruct',
      description: 'IBM Granite 3.1 8B Instruct model',
    }),
    mockAAModel({
      model_name: 'Llama 3.2 3B Instruct',
      model_id: 'Llama-3.2-3B-Instruct',
      display_name: 'Llama 3.2 3B Instruct',
      description: 'Meta Llama 3.2 3B Instruct model',
    }),
  ],
});

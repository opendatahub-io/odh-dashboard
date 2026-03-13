/* eslint-disable camelcase */
import type { MaaSModel } from '~/app/types';

export interface MaaSModelsResponse {
  data: MaaSModel[];
}

export const mockMaaSModel = (overrides?: Partial<MaaSModel>): MaaSModel => ({
  id: 'maas-llama-3-1-70b',
  object: 'model',
  created: 1700000000,
  owned_by: 'maas-provider',
  ready: true,
  url: 'https://maas.example.com/v1/models/llama-3-1-70b',
  display_name: 'Llama 3.1 70B MaaS',
  description: 'Llama 3.1 70B hosted via Models as a Service',
  usecase: 'text-generation',
  model_type: 'llm',
  ...overrides,
});

export const mockMaaSModels = (models?: Partial<MaaSModel>[]): MaaSModelsResponse => {
  if (!models || models.length === 0) {
    return {
      data: [mockMaaSModel()],
    };
  }

  return {
    data: models.map((model) => mockMaaSModel(model)),
  };
};

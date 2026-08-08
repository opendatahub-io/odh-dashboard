/* eslint-disable camelcase */
import type { OgxModel, OgxModelsResponse } from '~/app/types';

export const mockOgxModel = (overrides: Partial<OgxModel> = {}): OgxModel => ({
  id: 'llm-model-1',
  type: 'llm',
  provider: 'openai',
  resource_path: '/models/llm-1',
  ...overrides,
});

export const mockOgxModelsResponse = (models?: OgxModel[]): OgxModelsResponse => ({
  models: models ?? [
    mockOgxModel(),
    mockOgxModel({
      id: 'embedding-model-1',
      type: 'embedding',
      resource_path: '/models/emb-1',
    }),
  ],
});

/* eslint-disable camelcase */
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';

export const mockLlamaModels: LlamaModel[] = [
  {
    identifier: 'llama-3.1-8b-instruct',
    provider_id: 'meta-reference',
    provider_resource_id: 'llama-3.1-8b-instruct',
    model_type: 'llm',
    type: 'model',
    metadata: {},
  },
  {
    identifier: 'llama-3.1-70b-instruct',
    provider_id: 'meta-reference',
    provider_resource_id: 'llama-3.1-70b-instruct',
    model_type: 'llm',
    type: 'model',
    metadata: {},
  },
];

export const mockSingleModel: LlamaModel = {
  identifier: 'llama-3.1-8b-instruct',
  provider_id: 'meta-reference',
  provider_resource_id: 'llama-3.1-8b-instruct',
  model_type: 'llm',
  type: 'model',
  metadata: {},
};

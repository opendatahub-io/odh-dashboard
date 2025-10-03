/* eslint-disable camelcase */

import { LlamaModelResponse } from '~/app/types';

export const mockLlamaModels: LlamaModelResponse[] = [
  {
    id: 'ollama/llama3.2:3b',
    object: 'model',
    created: 1755721063,
    owned_by: 'llama_stack',
  },
  {
    id: 'ollama/all-minilm:l6-v2',
    object: 'model',
    created: 1755721063,
    owned_by: 'llama_stack',
  },
];

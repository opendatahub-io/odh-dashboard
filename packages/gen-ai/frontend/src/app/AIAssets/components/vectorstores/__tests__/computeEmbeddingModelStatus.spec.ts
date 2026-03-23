/* eslint-disable camelcase */
import type { AIModel, LlamaModel } from '~/app/types';
import {
  computeEmbeddingModelStatus,
  EmbeddingModelStatus,
} from '~/app/AIAssets/components/vectorstores/VectorStoreTableRow';

const makeAIModel = (model_id: string, overrides: Partial<AIModel> = {}): AIModel => ({
  model_name: 'test',
  model_id,
  serving_runtime: 'test',
  api_protocol: 'REST',
  version: '',
  usecase: 'LLM',
  description: '',
  endpoints: [],
  status: 'Running',
  display_name: 'Test',
  sa_token: { name: '', token_name: '', token: '' },
  model_source_type: 'namespace',
  ...overrides,
});

const makeLlamaModel = (modelId: string): LlamaModel => ({
  id: modelId,
  object: 'model',
  created: 0,
  owned_by: 'test',
  modelId,
});

type TestCase = {
  description: string;
  embeddingModel: string;
  allModels: AIModel[];
  playgroundModels: LlamaModel[];
  expected: EmbeddingModelStatus;
};

const testCases: TestCase[] = [
  // not_available
  {
    description: 'returns not_available when embedding model is absent from both lists',
    embeddingModel: 'nomic-embed',
    allModels: [],
    playgroundModels: [],
    expected: 'not_available',
  },
  {
    description: 'returns not_available when other models exist but none match',
    embeddingModel: 'nomic-embed',
    allModels: [makeAIModel('llama-3')],
    playgroundModels: [makeLlamaModel('llama-3')],
    expected: 'not_available',
  },

  // available (not registered)
  {
    description: 'returns available when allModels has an exact match and playground does not',
    embeddingModel: 'nomic-embed',
    allModels: [makeAIModel('nomic-embed')],
    playgroundModels: [],
    expected: 'available',
  },
  {
    description:
      'returns available when allModel has provider-prefixed ID and embeddingModel is plain',
    embeddingModel: 'nomic-embed',
    allModels: [makeAIModel('provider/nomic-embed')],
    playgroundModels: [],
    expected: 'available',
  },
  {
    description:
      'returns available when embeddingModel is provider-prefixed and allModel has plain ID',
    embeddingModel: 'provider/nomic-embed',
    allModels: [makeAIModel('nomic-embed')],
    playgroundModels: [],
    expected: 'available',
  },

  // registered
  {
    description: 'returns registered when playground has an exact match',
    embeddingModel: 'nomic-embed',
    allModels: [],
    playgroundModels: [makeLlamaModel('nomic-embed')],
    expected: 'registered',
  },
  {
    description:
      'returns registered when embeddingModel is provider-prefixed and playground has normalized ID',
    embeddingModel: 'provider/nomic-embed',
    allModels: [],
    playgroundModels: [makeLlamaModel('nomic-embed')],
    expected: 'registered',
  },
  {
    description:
      'returns registered when embeddingModel is plain and playground has the same plain ID',
    embeddingModel: 'nomic-embed',
    allModels: [],
    playgroundModels: [makeLlamaModel('nomic-embed')],
    expected: 'registered',
  },

  // registered takes priority over available
  {
    description: 'returns registered (not available) when model is present in both lists',
    embeddingModel: 'nomic-embed',
    allModels: [makeAIModel('nomic-embed')],
    playgroundModels: [makeLlamaModel('nomic-embed')],
    expected: 'registered',
  },
];

describe('computeEmbeddingModelStatus', () => {
  it.each(testCases)(
    '$description',
    ({ embeddingModel, allModels, playgroundModels, expected }) => {
      expect(computeEmbeddingModelStatus(embeddingModel, allModels, playgroundModels)).toBe(
        expected,
      );
    },
  );
});

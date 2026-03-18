/* eslint-disable camelcase */
import type { AIModel, MaaSModel } from '~/app/types';
import {
  convertMaaSModelToAIModel,
  getSourceLabel,
  splitLlamaModelId,
} from '~/app/utilities/utils';

const makeModel = (overrides: Partial<AIModel> = {}): AIModel => ({
  model_name: 'test',
  model_id: 'test',
  serving_runtime: 'test',
  api_protocol: 'REST',
  version: '',
  usecase: 'LLM',
  description: '',
  endpoints: [],
  status: 'Running' as const,
  display_name: 'Test',
  sa_token: { name: '', token_name: '', token: '' },
  model_source_type: 'namespace',
  ...overrides,
});

describe('getSourceLabel', () => {
  it('should return "Internal" for namespace without external endpoint', () => {
    expect(getSourceLabel(makeModel({ model_source_type: 'namespace' }))).toBe('Internal');
  });

  it('should return "Internal" for namespace with external endpoint', () => {
    expect(
      getSourceLabel(
        makeModel({ model_source_type: 'namespace', externalEndpoint: 'https://example.com' }),
      ),
    ).toBe('Internal');
  });

  it('should return "Public route" for external_cluster', () => {
    expect(getSourceLabel(makeModel({ model_source_type: 'external_cluster' }))).toBe(
      'Public route',
    );
  });

  it('should return "External" for external_provider', () => {
    expect(getSourceLabel(makeModel({ model_source_type: 'external_provider' }))).toBe('External');
  });

  it('should return "MaaS" for maas', () => {
    expect(getSourceLabel(makeModel({ model_source_type: 'maas' }))).toBe('MaaS');
  });

  it('should return "Internal" when model_source_type is undefined', () => {
    expect(getSourceLabel(makeModel())).toBe('Internal');
  });
});

describe('convertMaaSModelToAIModel', () => {
  it('should map url to externalEndpoint (not internalEndpoint)', () => {
    const maasModel: MaaSModel = {
      id: 'test-model',
      object: 'model',
      created: 0,
      owned_by: 'org',
      ready: true,
      url: 'https://maas.example.com/model',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.externalEndpoint).toBe('https://maas.example.com/model');
    expect(result.internalEndpoint).toBeUndefined();
  });

  it('should set internalEndpoint to undefined', () => {
    const maasModel: MaaSModel = {
      id: 'test-model',
      object: 'model',
      created: 0,
      owned_by: 'org',
      ready: true,
      url: 'https://maas.example.com/model',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.internalEndpoint).toBeUndefined();
  });

  it('should set model_source_type to "maas"', () => {
    const maasModel: MaaSModel = {
      id: 'test-model',
      object: 'model',
      created: 0,
      owned_by: 'org',
      ready: true,
      url: 'https://maas.example.com/model',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.model_source_type).toBe('maas');
  });

  it('should use model_type from BFF when available', () => {
    const maasModel: MaaSModel = {
      id: 'nomic-embed',
      object: 'model',
      created: Date.now(),
      owned_by: 'maas',
      ready: true,
      url: 'https://example.com',
      usecase: 'Embedding, Semantic search',
      model_type: 'embedding',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.model_type).toBe('embedding');
  });

  it('should leave model_type undefined when not provided by BFF', () => {
    const maasModel: MaaSModel = {
      id: 'llama-2',
      object: 'model',
      created: Date.now(),
      owned_by: 'maas',
      ready: true,
      url: 'https://example.com',
      usecase: 'Chat, Question answering',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.model_type).toBeUndefined();
  });

  it('should set model_source_type and model_id correctly', () => {
    const maasModel: MaaSModel = {
      id: 'my-maas-model-id',
      object: 'model',
      created: 0,
      owned_by: 'org',
      ready: true,
      url: 'https://maas.example.com/model',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.model_source_type).toBe('maas');
    expect(result.model_id).toBe('my-maas-model-id');
  });

  it('should use display_name for model_name when available', () => {
    const maasModel: MaaSModel = {
      id: 'llama-2-7b-chat',
      object: 'model',
      created: Date.now(),
      owned_by: 'maas',
      ready: true,
      url: 'https://example.com',
      display_name: 'Llama 2 7B Chat',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.model_name).toBe('Llama 2 7B Chat');
  });

  it('should fall back to id for model_name when display_name is missing', () => {
    const maasModel: MaaSModel = {
      id: 'llama-2-7b-chat',
      object: 'model',
      created: Date.now(),
      owned_by: 'maas',
      ready: true,
      url: 'https://example.com',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.model_name).toBe('llama-2-7b-chat');
  });

  it('should use external: prefix in endpoints array', () => {
    const maasModel: MaaSModel = {
      id: 'test-model',
      object: 'model',
      created: 0,
      owned_by: 'org',
      ready: true,
      url: 'https://maas.example.com/model',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.endpoints).toEqual(['external: https://maas.example.com/model']);
  });

  it('should handle missing url gracefully', () => {
    const maasModel: MaaSModel = {
      id: 'no-url-model',
      object: 'model',
      created: 0,
      owned_by: 'org',
      ready: true,
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.endpoints).toEqual([]);
    expect(result.externalEndpoint).toBeUndefined();
  });
});

describe('splitLlamaModelId', () => {
  it('should split a valid model ID with provider and ID', () => {
    const result = splitLlamaModelId('vllm-inference-1/facebook-opt-1');
    expect(result).toEqual({
      providerId: 'vllm-inference-1',
      id: 'facebook-opt-1',
    });
  });

  it('should handle model ID without slash', () => {
    const result = splitLlamaModelId('facebook-opt-1');
    expect(result).toEqual({
      providerId: '',
      id: 'facebook-opt-1',
    });
  });

  it('should handle empty string', () => {
    const result = splitLlamaModelId('');
    expect(result).toEqual({
      providerId: '',
      id: '',
    });
  });

  it('should handle model ID with multiple slashes (only splits on first)', () => {
    const result = splitLlamaModelId('vllm-inference-1/facebook/opt-1');
    expect(result).toEqual({
      providerId: 'vllm-inference-1',
      id: 'facebook/opt-1',
    });
  });

  it('should handle complex provider and model names', () => {
    const result = splitLlamaModelId('anthropic-vertex/claude-3-opus-20240229');
    expect(result).toEqual({
      providerId: 'anthropic-vertex',
      id: 'claude-3-opus-20240229',
    });
  });

  it('should handle model ID with special characters', () => {
    const result = splitLlamaModelId('provider-123/model_name-v2.0');
    expect(result).toEqual({
      providerId: 'provider-123',
      id: 'model_name-v2.0',
    });
  });
});

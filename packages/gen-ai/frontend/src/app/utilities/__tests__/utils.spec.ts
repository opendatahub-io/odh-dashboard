/* eslint-disable camelcase */
import type { AIModel, LlamaModel, MaaSModel } from '~/app/types';
import {
  convertMaaSModelToAIModel,
  getLlamaModelDisplayName,
  getSourceLabel,
  isLlamaModelEnabled,
  isPlaygroundModelMatchForAIModel,
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

  it('should return "Custom endpoint" for custom_endpoint', () => {
    expect(getSourceLabel(makeModel({ model_source_type: 'custom_endpoint' }))).toBe(
      'Custom endpoint',
    );
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

const makeMaaSModel = (overrides: Partial<MaaSModel> = {}): MaaSModel => ({
  id: 'test-maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'maas',
  ready: true,
  url: 'https://maas.example.com/model',
  display_name: 'Test MaaS Model',
  ...overrides,
});

const makeLlamaModel = (overrides: Partial<LlamaModel> = {}): LlamaModel => ({
  id: 'test-provider/test-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'test',
  modelId: 'test-model',
  ...overrides,
});

describe('getLlamaModelDisplayName', () => {
  it('should return modelId when aiModels is null', () => {
    const result = getLlamaModelDisplayName('test-model', null);
    expect(result).toBe('test-model');
  });

  it('should return modelId when aiModels is undefined', () => {
    const result = getLlamaModelDisplayName('test-model', undefined);
    expect(result).toBe('test-model');
  });

  it('should return modelId when aiModels is empty array', () => {
    const result = getLlamaModelDisplayName('test-model', []);
    expect(result).toBe('test-model');
  });

  it('should return model display name when model found without provider', () => {
    const aiModels = [makeModel({ model_id: 'test-model', display_name: 'Test Display Name' })];
    const result = getLlamaModelDisplayName('test-model', aiModels);
    expect(result).toBe('Test Display Name');
  });

  it('should return provider/display_name when model found with provider', () => {
    const aiModels = [makeModel({ model_id: 'test-model', display_name: 'Test Display Name' })];
    const result = getLlamaModelDisplayName('provider/test-model', aiModels);
    expect(result).toBe('provider/Test Display Name');
  });

  it('should return original modelId when no matching model found', () => {
    const aiModels = [makeModel({ model_id: 'other-model', display_name: 'Other Model' })];
    const result = getLlamaModelDisplayName('test-model', aiModels);
    expect(result).toBe('test-model');
  });

  it('should handle complex provider/model ID correctly', () => {
    const aiModels = [makeModel({ model_id: 'llama-2-7b-chat', display_name: 'Llama 2 7B Chat' })];
    const result = getLlamaModelDisplayName('anthropic-vertex/llama-2-7b-chat', aiModels);
    expect(result).toBe('anthropic-vertex/Llama 2 7B Chat');
  });
});

describe('isLlamaModelEnabled', () => {
  describe('with null/undefined aiModels and maasModels', () => {
    it('should return false when aiModels is null and maasModels is null', () => {
      const result = isLlamaModelEnabled('test-model', null, null, false);
      expect(result).toBe(false);
    });

    it('should return false when aiModels is undefined and maasModels is undefined', () => {
      const result = isLlamaModelEnabled('test-model', undefined, undefined, false);
      expect(result).toBe(false);
    });

    it('should return false when aiModels is empty and maasModels is empty', () => {
      const result = isLlamaModelEnabled('test-model', [], [], false);
      expect(result).toBe(false);
    });

    it('should return true when isCustomLSD is true regardless of null models', () => {
      const result = isLlamaModelEnabled('test-model', null, null, true);
      expect(result).toBe(true);
    });

    it('should return true when isCustomLSD is true regardless of undefined models', () => {
      const result = isLlamaModelEnabled('test-model', undefined, undefined, true);
      expect(result).toBe(true);
    });
  });

  describe('with valid aiModels', () => {
    it('should return true when aiModel found and status is Running', () => {
      const aiModels = [makeModel({ model_id: 'test-model', status: 'Running' })];
      const result = isLlamaModelEnabled('test-model', aiModels, null, false);
      expect(result).toBe(true);
    });

    it('should return true when aiModel found and model_source_type is custom_endpoint', () => {
      const aiModels = [
        makeModel({
          model_id: 'test-model',
          status: 'Stop',
          model_source_type: 'custom_endpoint',
        }),
      ];
      const result = isLlamaModelEnabled('test-model', aiModels, null, false);
      expect(result).toBe(true);
    });

    it('should return false when aiModel found but status is not Running and not custom_endpoint', () => {
      const aiModels = [
        makeModel({
          model_id: 'test-model',
          status: 'Stop',
          model_source_type: 'namespace',
        }),
      ];
      const result = isLlamaModelEnabled('test-model', aiModels, null, false);
      expect(result).toBe(false);
    });
  });

  describe('with valid maasModels', () => {
    it('should return true when maasModel found and ready is true', () => {
      const maasModels = [makeMaaSModel({ id: 'test-model', ready: true })];
      const result = isLlamaModelEnabled('test-model', null, maasModels, false);
      expect(result).toBe(true);
    });

    it('should return false when maasModel found but ready is false', () => {
      const maasModels = [makeMaaSModel({ id: 'test-model', ready: false })];
      const result = isLlamaModelEnabled('test-model', null, maasModels, false);
      expect(result).toBe(false);
    });

    it('should handle maasModels when aiModels is null', () => {
      const maasModels = [makeMaaSModel({ id: 'test-model', ready: true })];
      const result = isLlamaModelEnabled('test-model', null, maasModels, false);
      expect(result).toBe(true);
    });
  });

  describe('with complex modelIds (provider/model format)', () => {
    it('should extract model ID correctly from provider/model format for aiModels', () => {
      const aiModels = [makeModel({ model_id: 'llama-2-7b-chat', status: 'Running' })];
      const result = isLlamaModelEnabled('anthropic-vertex/llama-2-7b-chat', aiModels, null, false);
      expect(result).toBe(true);
    });

    it('should extract model ID correctly from provider/model format for maasModels', () => {
      const maasModels = [makeMaaSModel({ id: 'llama-2-7b-chat', ready: true })];
      const result = isLlamaModelEnabled(
        'anthropic-vertex/llama-2-7b-chat',
        null,
        maasModels,
        false,
      );
      expect(result).toBe(true);
    });
  });

  describe('edge cases that caused the original null reference error', () => {
    it('should not crash when dipanshu namespace scenario (aiModels=null, maasModels=null)', () => {
      // This is the exact scenario that caused the original crash in dipanshu namespace
      expect(() => {
        const result = isLlamaModelEnabled('test-model', null, null, false);
        expect(result).toBe(false);
      }).not.toThrow();
    });

    it('should not crash when both arrays are undefined', () => {
      expect(() => {
        const result = isLlamaModelEnabled('test-model', undefined, undefined, false);
        expect(result).toBe(false);
      }).not.toThrow();
    });

    it('should handle mixed null and undefined gracefully', () => {
      expect(() => {
        const result = isLlamaModelEnabled('test-model', null, undefined, false);
        expect(result).toBe(false);
      }).not.toThrow();
    });
  });
});

describe('isPlaygroundModelMatchForAIModel', () => {
  it('should return false when modelIds do not match', () => {
    const playgroundModel = makeLlamaModel({ modelId: 'model-1' });
    const aiModel = makeModel({ model_id: 'model-2' });

    const result = isPlaygroundModelMatchForAIModel(playgroundModel, aiModel);
    expect(result).toBe(false);
  });

  it('should return true for MaaS models with maas- provider prefix', () => {
    const playgroundModel = makeLlamaModel({
      modelId: 'test-model',
      id: 'maas-vllm-inference-1/test-model',
    });
    const aiModel = makeModel({
      model_id: 'test-model',
      model_source_type: 'maas',
    });

    const result = isPlaygroundModelMatchForAIModel(playgroundModel, aiModel);
    expect(result).toBe(true);
  });

  it('should return false for MaaS models without maas- provider prefix', () => {
    const playgroundModel = makeLlamaModel({
      modelId: 'test-model',
      id: 'regular-provider/test-model',
    });
    const aiModel = makeModel({
      model_id: 'test-model',
      model_source_type: 'maas',
    });

    const result = isPlaygroundModelMatchForAIModel(playgroundModel, aiModel);
    expect(result).toBe(false);
  });

  it('should return true for non-MaaS models without maas- provider prefix', () => {
    const playgroundModel = makeLlamaModel({
      modelId: 'test-model',
      id: 'regular-provider/test-model',
    });
    const aiModel = makeModel({
      model_id: 'test-model',
      model_source_type: 'namespace',
    });

    const result = isPlaygroundModelMatchForAIModel(playgroundModel, aiModel);
    expect(result).toBe(true);
  });

  it('should return false for non-MaaS models with maas- provider prefix', () => {
    const playgroundModel = makeLlamaModel({
      modelId: 'test-model',
      id: 'maas-vllm-inference-1/test-model',
    });
    const aiModel = makeModel({
      model_id: 'test-model',
      model_source_type: 'namespace',
    });

    const result = isPlaygroundModelMatchForAIModel(playgroundModel, aiModel);
    expect(result).toBe(false);
  });
});

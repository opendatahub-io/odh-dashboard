/* eslint-disable camelcase */
import type { AIModel, LlamaModel, MaaSModel } from '~/app/types';
import {
  convertMaaSModelToAIModel,
  getSourceLabel,
  hasCapability,
  isASRModel,
  isASROnlyModel,
  isMaasLlamaModelId,
  isPlaygroundModelMatchForAIModel,
  isVisionModel,
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

describe('isASRModel', () => {
  it('should return true for model with audio-transcription capability', () => {
    expect(isASRModel(makeModel({ capabilities: ['audio-transcription'] }))).toBe(true);
  });

  it('should return true when audio-transcription is one of multiple capabilities', () => {
    expect(
      isASRModel(makeModel({ capabilities: ['text-generation', 'audio-transcription'] })),
    ).toBe(true);
  });

  it('should return false for model with undefined capabilities', () => {
    expect(isASRModel(makeModel())).toBe(false);
  });

  it('should return false for model with empty capabilities array', () => {
    expect(isASRModel(makeModel({ capabilities: [] }))).toBe(false);
  });

  it('should return false for model with different capabilities', () => {
    expect(isASRModel(makeModel({ capabilities: ['vision'] }))).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isASRModel(makeModel({ capabilities: ['Audio-Transcription'] }))).toBe(false);
  });
});

describe('isASROnlyModel', () => {
  it('should return true when audio-transcription is the only capability', () => {
    expect(isASROnlyModel(makeModel({ capabilities: ['audio-transcription'] }))).toBe(true);
  });

  it('should return false when model has ASR plus other capabilities', () => {
    expect(
      isASROnlyModel(makeModel({ capabilities: ['text-generation', 'audio-transcription'] })),
    ).toBe(false);
  });

  it('should return false for model with undefined capabilities', () => {
    expect(isASROnlyModel(makeModel())).toBe(false);
  });

  it('should return false for model with empty capabilities array', () => {
    expect(isASROnlyModel(makeModel({ capabilities: [] }))).toBe(false);
  });

  it('should return false for model with only non-ASR capabilities', () => {
    expect(isASROnlyModel(makeModel({ capabilities: ['vision'] }))).toBe(false);
  });
});

describe('hasCapability', () => {
  it('should return true when model has the specified capability', () => {
    expect(hasCapability(makeModel({ capabilities: ['vision'] }), 'vision')).toBe(true);
  });

  it('should return false when model does not have the specified capability', () => {
    expect(hasCapability(makeModel({ capabilities: ['text-generation'] }), 'vision')).toBe(false);
  });

  it('should return false when capabilities is undefined', () => {
    expect(hasCapability(makeModel(), 'vision')).toBe(false);
  });

  it('should return false when capabilities is empty', () => {
    expect(hasCapability(makeModel({ capabilities: [] }), 'vision')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(hasCapability(makeModel({ capabilities: ['Vision'] }), 'vision')).toBe(false);
  });
});

describe('isVisionModel', () => {
  it('should return true for model with vision capability', () => {
    expect(isVisionModel(makeModel({ capabilities: ['vision'] }))).toBe(true);
  });

  it('should return true when vision is one of multiple capabilities', () => {
    expect(isVisionModel(makeModel({ capabilities: ['text-generation', 'vision'] }))).toBe(true);
  });

  it('should return false for model with undefined capabilities', () => {
    expect(isVisionModel(makeModel())).toBe(false);
  });

  it('should return false for model with empty capabilities array', () => {
    expect(isVisionModel(makeModel({ capabilities: [] }))).toBe(false);
  });

  it('should return false for model with only text-generation capability', () => {
    expect(isVisionModel(makeModel({ capabilities: ['text-generation'] }))).toBe(false);
  });

  it('should return false for model with audio-transcription but not vision', () => {
    expect(isVisionModel(makeModel({ capabilities: ['audio-transcription'] }))).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isVisionModel(makeModel({ capabilities: ['Vision'] }))).toBe(false);
  });
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

  it('should set capabilities to empty array for MaaS models', () => {
    const maasModel: MaaSModel = {
      id: 'test-model',
      object: 'model',
      created: 0,
      owned_by: 'org',
      ready: true,
      url: 'https://maas.example.com/model',
    };
    const result = convertMaaSModelToAIModel(maasModel);
    expect(result.capabilities).toEqual([]);
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

describe('isMaasLlamaModelId', () => {
  it('returns true for ids with maas- provider prefix', () => {
    expect(isMaasLlamaModelId('maas-openai/gpt-4')).toBe(true);
  });

  it('returns false for namespace model ids', () => {
    expect(isMaasLlamaModelId('vllm-inference/llama-7b')).toBe(false);
  });

  it('returns false for id without slash', () => {
    expect(isMaasLlamaModelId('llama-7b')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isMaasLlamaModelId('')).toBe(false);
  });
});

describe('isPlaygroundModelMatchForAIModel', () => {
  const makeLlamaModel = (overrides: Partial<LlamaModel> = {}): LlamaModel => ({
    id: 'vllm-inference/llama-7b',
    modelId: 'llama-7b',
    object: 'model',
    created: 0,
    owned_by: '',
    ...overrides,
  });

  it('matches namespace playground model to namespace AIModel with same model_id', () => {
    const playground = makeLlamaModel({ id: 'vllm-inference/llama-7b', modelId: 'llama-7b' });
    const aiModel = makeModel({ model_id: 'llama-7b', model_source_type: 'namespace' });
    expect(isPlaygroundModelMatchForAIModel(playground, aiModel)).toBe(true);
  });

  it('matches maas playground model to maas AIModel with same model_id', () => {
    const playground = makeLlamaModel({ id: 'maas-openai/gpt-4', modelId: 'gpt-4' });
    const aiModel = makeModel({ model_id: 'gpt-4', model_source_type: 'maas' });
    expect(isPlaygroundModelMatchForAIModel(playground, aiModel)).toBe(true);
  });

  it('does not match when model_id differs', () => {
    const playground = makeLlamaModel({ id: 'vllm-inference/llama-7b', modelId: 'llama-7b' });
    const aiModel = makeModel({ model_id: 'llama-13b', model_source_type: 'namespace' });
    expect(isPlaygroundModelMatchForAIModel(playground, aiModel)).toBe(false);
  });

  it('does not match namespace playground model to maas AIModel with same model_id', () => {
    const playground = makeLlamaModel({ id: 'vllm-inference/gpt-4', modelId: 'gpt-4' });
    const aiModel = makeModel({ model_id: 'gpt-4', model_source_type: 'maas' });
    expect(isPlaygroundModelMatchForAIModel(playground, aiModel)).toBe(false);
  });

  it('does not match maas playground model to namespace AIModel with same model_id', () => {
    const playground = makeLlamaModel({ id: 'maas-openai/llama-7b', modelId: 'llama-7b' });
    const aiModel = makeModel({ model_id: 'llama-7b', model_source_type: 'namespace' });
    expect(isPlaygroundModelMatchForAIModel(playground, aiModel)).toBe(false);
  });

  it('matches custom_endpoint playground model to custom_endpoint AIModel', () => {
    const playground = makeLlamaModel({ id: 'custom-ep/my-model', modelId: 'my-model' });
    const aiModel = makeModel({ model_id: 'my-model', model_source_type: 'custom_endpoint' });
    expect(isPlaygroundModelMatchForAIModel(playground, aiModel)).toBe(true);
  });
});

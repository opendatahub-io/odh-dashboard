/* eslint-disable camelcase */
import type { AAModelResponse, AIModel, LlamaModel } from '~/app/types';
import {
  convertMaaSModelToAIModel,
  getCapabilityDisplay,
  getSourceLabel,
  getVisibleCapabilities,
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
  const makeAAModelResponse = (overrides: Partial<AAModelResponse> = {}): AAModelResponse => ({
    model_name: 'test-model',
    model_id: 'test-model',
    serving_runtime: 'MaaS',
    api_protocol: 'OpenAI',
    version: '',
    usecase: 'LLM',
    description: '',
    endpoints: [],
    status: 'Running',
    display_name: 'Test Model',
    sa_token: { name: '', token_name: '', token: '' },
    model_source_type: 'maas',
    ...overrides,
  });

  it('should parse external: prefixed endpoint to externalEndpoint', () => {
    const aaModel = makeAAModelResponse({
      endpoints: ['external:https://maas.example.com/model'],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBe('https://maas.example.com/model');
  });

  it('should parse external: with space after colon', () => {
    const aaModel = makeAAModelResponse({
      endpoints: ['external: https://maas.example.com/model'],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBe('https://maas.example.com/model');
  });

  it('should parse non-prefixed endpoint to internalEndpoint', () => {
    const aaModel = makeAAModelResponse({
      endpoints: ['http://service.namespace.svc.cluster.local:8080'],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.internalEndpoint).toBe('http://service.namespace.svc.cluster.local:8080');
  });

  it('should parse both external and internal endpoints with prefix', () => {
    const aaModel = makeAAModelResponse({
      endpoints: [
        'external:https://maas.example.com/v1',
        'internal:http://maas-service.ns.svc.cluster.local:8000',
      ],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBe('https://maas.example.com/v1');
    expect(result.internalEndpoint).toBe('http://maas-service.ns.svc.cluster.local:8000');
  });

  it('should parse external with prefix and internal without prefix', () => {
    const aaModel = makeAAModelResponse({
      endpoints: [
        'external:https://maas.example.com/v1',
        'http://maas-service.ns.svc.cluster.local:8000',
      ],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBe('https://maas.example.com/v1');
    expect(result.internalEndpoint).toBe('http://maas-service.ns.svc.cluster.local:8000');
  });

  it('should handle empty endpoints array', () => {
    const aaModel = makeAAModelResponse({ endpoints: [] });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBeUndefined();
    expect(result.internalEndpoint).toBeUndefined();
  });

  it('should only parse external endpoint when no internal endpoint exists', () => {
    const aaModel = makeAAModelResponse({
      endpoints: ['external:https://api.maas.io/models/llama'],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBe('https://api.maas.io/models/llama');
    expect(result.internalEndpoint).toBeUndefined();
  });

  it('should preserve all AAModelResponse fields', () => {
    const aaModel = makeAAModelResponse({
      model_id: 'llama-2-7b',
      display_name: 'Llama 2 7B',
      model_source_type: 'maas',
      status: 'Running',
      endpoints: ['external: https://example.com'],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.model_id).toBe('llama-2-7b');
    expect(result.display_name).toBe('Llama 2 7B');
    expect(result.model_source_type).toBe('maas');
    expect(result.status).toBe('Running');
  });

  it('should pass through model_type field', () => {
    const aaModel = makeAAModelResponse({
      model_type: 'embedding',
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.model_type).toBe('embedding');
  });

  it('should pass through capabilities field', () => {
    const aaModel = makeAAModelResponse({
      capabilities: ['vision', 'audio-transcription'],
    });
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.capabilities).toEqual(['vision', 'audio-transcription']);
  });

  it('should handle undefined endpoints gracefully', () => {
    const aaModel = {
      ...makeAAModelResponse(),
      endpoints: undefined,
    } as unknown as AAModelResponse;
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBeUndefined();
    expect(result.internalEndpoint).toBeUndefined();
  });

  it('should filter out non-string entries in endpoints array', () => {
    const aaModel = {
      ...makeAAModelResponse(),
      endpoints: ['external:https://valid.com', null, 123, 'http://internal', undefined],
    } as unknown as AAModelResponse;
    const result = convertMaaSModelToAIModel(aaModel);
    expect(result.externalEndpoint).toBe('https://valid.com');
    expect(result.internalEndpoint).toBe('http://internal');
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

describe('getCapabilityDisplay', () => {
  it('returns Vision with green for vision capability', () => {
    expect(getCapabilityDisplay('vision')).toEqual({ label: 'Vision', color: 'green' });
  });

  it('returns Transcription with purple for audio-transcription capability', () => {
    expect(getCapabilityDisplay('audio-transcription')).toEqual({
      label: 'Transcription',
      color: 'purple',
    });
  });

  it('returns title-cased fallback with cyan for unknown capabilities', () => {
    expect(getCapabilityDisplay('custom-thing')).toEqual({
      label: 'Custom Thing',
      color: 'cyan',
    });
  });

  it('handles single-word unknown capabilities', () => {
    expect(getCapabilityDisplay('embeddings')).toEqual({
      label: 'Embeddings',
      color: 'cyan',
    });
  });
});

describe('getVisibleCapabilities', () => {
  it('filters out text-generation', () => {
    expect(getVisibleCapabilities(['text-generation', 'vision'])).toEqual(['vision']);
  });

  it('returns empty array when only text-generation is present', () => {
    expect(getVisibleCapabilities(['text-generation'])).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(getVisibleCapabilities(undefined)).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(getVisibleCapabilities([])).toEqual([]);
  });

  it('preserves multiple non-text-generation capabilities', () => {
    expect(getVisibleCapabilities(['text-generation', 'vision', 'audio-transcription'])).toEqual([
      'vision',
      'audio-transcription',
    ]);
  });
});

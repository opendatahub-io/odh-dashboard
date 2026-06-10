/* eslint-disable camelcase */
import { renderHook } from '@testing-library/react';
import type { AIModel } from '~/app/types';
import useASRModels from '~/app/hooks/useASRModels';

const makeModel = (overrides: Partial<AIModel> = {}): AIModel => ({
  model_name: 'test',
  model_id: 'test',
  serving_runtime: 'vllm',
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

describe('useASRModels', () => {
  it('should return only models with modality audio-transcription and source_type namespace', () => {
    const models: AIModel[] = [
      makeModel({ model_id: 'whisper', modality: 'audio-transcription' }),
      makeModel({ model_id: 'llama', model_type: 'llm' }),
      makeModel({ model_id: 'embed', model_type: 'embedding' }),
    ];

    const { result } = renderHook(() => useASRModels(models));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].model_id).toBe('whisper');
  });

  it('should return empty array when no ASR models exist', () => {
    const models: AIModel[] = [
      makeModel({ model_id: 'llama', model_type: 'llm' }),
      makeModel({ model_id: 'embed', model_type: 'embedding' }),
    ];

    const { result } = renderHook(() => useASRModels(models));
    expect(result.current).toHaveLength(0);
  });

  it('should exclude custom_endpoint and maas models even with ASR modality', () => {
    const models: AIModel[] = [
      makeModel({
        model_id: 'whisper-ns',
        modality: 'audio-transcription',
        model_source_type: 'namespace',
      }),
      makeModel({
        model_id: 'whisper-ext',
        modality: 'audio-transcription',
        model_source_type: 'custom_endpoint',
      }),
      makeModel({
        model_id: 'whisper-maas',
        modality: 'audio-transcription',
        model_source_type: 'maas',
      }),
    ];

    const { result } = renderHook(() => useASRModels(models));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].model_id).toBe('whisper-ns');
  });

  it('should exclude models with empty string modality', () => {
    const models: AIModel[] = [
      makeModel({ model_id: 'empty-mod', modality: '' }),
      makeModel({ model_id: 'whisper', modality: 'audio-transcription' }),
    ];

    const { result } = renderHook(() => useASRModels(models));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].model_id).toBe('whisper');
  });
});

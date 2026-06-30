/* eslint-disable camelcase */
import { renderHook } from '@testing-library/react';
import type { AIModel } from '~/app/types';
import useWorkspaceCapabilities from '~/app/hooks/useWorkspaceCapabilities';

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

describe('useWorkspaceCapabilities', () => {
  describe('capabilitiesReady', () => {
    it('should be false when aiModels not loaded', () => {
      const { result } = renderHook(() => useWorkspaceCapabilities([], false, true, undefined));
      expect(result.current.capabilitiesReady).toBe(false);
    });

    it('should be false when maasModels not loaded', () => {
      const { result } = renderHook(() => useWorkspaceCapabilities([], true, false, undefined));
      expect(result.current.capabilitiesReady).toBe(false);
    });

    it('should be true when both aiModels and maasModels are loaded', () => {
      const { result } = renderHook(() => useWorkspaceCapabilities([], true, true, undefined));
      expect(result.current.capabilitiesReady).toBe(true);
    });
  });

  describe('capabilitiesError', () => {
    it('should be false when no error', () => {
      const { result } = renderHook(() => useWorkspaceCapabilities([], true, true, undefined));
      expect(result.current.capabilitiesError).toBe(false);
    });

    it('should be true when aiModelsError is set', () => {
      const { result } = renderHook(() =>
        useWorkspaceCapabilities([], true, true, new Error('fetch failed')),
      );
      expect(result.current.capabilitiesError).toBe(true);
    });
  });

  describe('hasVisionModel', () => {
    it('should be false when no models have vision capability', () => {
      const models = [
        makeModel({ model_id: 'llm-1', capabilities: ['text-generation'] }),
        makeModel({ model_id: 'llm-2', capabilities: ['text-generation'] }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(false);
    });

    it('should be true when at least one model has vision capability', () => {
      const models = [
        makeModel({ model_id: 'llm-1', capabilities: ['text-generation'] }),
        makeModel({ model_id: 'vision-1', capabilities: ['text-generation', 'vision'] }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(true);
    });

    it('should be false when models array is empty', () => {
      const { result } = renderHook(() => useWorkspaceCapabilities([], true, true, undefined));
      expect(result.current.hasVisionModel).toBe(false);
    });

    it('should be false when aiModels not yet loaded', () => {
      const models = [makeModel({ model_id: 'vision-1', capabilities: ['vision'] })];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, false, true, undefined));
      expect(result.current.hasVisionModel).toBe(false);
    });

    it('should detect vision on custom_endpoint models', () => {
      const models = [
        makeModel({
          model_id: 'custom-vision',
          capabilities: ['vision'],
          model_source_type: 'custom_endpoint',
        }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(true);
    });

    it('should be false when only capability is text-generation (BFF default)', () => {
      const models = [makeModel({ model_id: 'default-model', capabilities: ['text-generation'] })];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(false);
    });
  });

  describe('hasASRModel', () => {
    it('should be false when no namespace models have audio-transcription', () => {
      const models = [makeModel({ model_id: 'llm-1', capabilities: ['text-generation'] })];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasASRModel).toBe(false);
    });

    it('should be true when a namespace model has audio-transcription', () => {
      const models = [
        makeModel({
          model_id: 'whisper',
          capabilities: ['audio-transcription'],
          model_source_type: 'namespace',
        }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasASRModel).toBe(true);
    });

    it('should exclude custom_endpoint models with audio-transcription', () => {
      const models = [
        makeModel({
          model_id: 'whisper-ext',
          capabilities: ['audio-transcription'],
          model_source_type: 'custom_endpoint',
        }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasASRModel).toBe(false);
    });

    it('should exclude maas models with audio-transcription', () => {
      const models = [
        makeModel({
          model_id: 'whisper-maas',
          capabilities: ['audio-transcription'],
          model_source_type: 'maas',
        }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasASRModel).toBe(false);
    });

    it('should be false when aiModels not yet loaded', () => {
      const models = [makeModel({ model_id: 'whisper', capabilities: ['audio-transcription'] })];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, false, true, undefined));
      expect(result.current.hasASRModel).toBe(false);
    });
  });

  describe('edge cases from AC table', () => {
    it('no annotations in namespace — all false', () => {
      const models = [
        makeModel({ model_id: 'llm-1', capabilities: ['text-generation'] }),
        makeModel({ model_id: 'llm-2', capabilities: ['text-generation'] }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(false);
      expect(result.current.hasASRModel).toBe(false);
    });

    it('mixed workspace — one vision, one ASR', () => {
      const models = [
        makeModel({ model_id: 'vision-model', capabilities: ['text-generation', 'vision'] }),
        makeModel({ model_id: 'asr-model', capabilities: ['audio-transcription'] }),
        makeModel({ model_id: 'text-only', capabilities: ['text-generation'] }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(true);
      expect(result.current.hasASRModel).toBe(true);
    });

    it('two vision models, remove one — still detects vision', () => {
      const models = [
        makeModel({ model_id: 'vision-1', capabilities: ['vision'] }),
        makeModel({ model_id: 'text-only', capabilities: ['text-generation'] }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(true);
    });

    it('all models have empty capabilities (like MaaS in BFF)', () => {
      const models = [
        makeModel({ model_id: 'm1', capabilities: [] }),
        makeModel({ model_id: 'm2', capabilities: [] }),
      ];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, true, undefined));
      expect(result.current.hasVisionModel).toBe(false);
      expect(result.current.hasASRModel).toBe(false);
    });

    it('partial load — aiModels ready, MaaS not', () => {
      const models = [makeModel({ model_id: 'vision-1', capabilities: ['vision'] })];
      const { result } = renderHook(() => useWorkspaceCapabilities(models, true, false, undefined));
      expect(result.current.capabilitiesReady).toBe(false);
      expect(result.current.hasVisionModel).toBe(true);
    });
  });
});

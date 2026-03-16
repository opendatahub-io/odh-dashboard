/* eslint-disable camelcase */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import useMergedModels from '~/app/hooks/useMergedModels';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';
import { AIModel } from '~/app/types';
import type { MaaSModel } from '~/app/types';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

jest.mock('~/app/hooks/useFetchAIModels');
jest.mock('~/app/hooks/useFetchMaaSModels');

const mockUseFetchAIModels = jest.mocked(useFetchAIModels);
const mockUseFetchMaaSModels = jest.mocked(useFetchMaaSModels);

const createAIModel = (overrides: Partial<AIModel>): AIModel => ({
  model_name: 'model-name',
  model_id: overrides.model_name || 'model-name',
  display_name: 'Display Name',
  description: 'desc',
  endpoints: [],
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  status: 'Running',
  sa_token: { name: '', token_name: '', token: '' },
  model_source_type: 'namespace',
  ...overrides,
});

const createMaaSModel = (overrides: Partial<MaaSModel>): MaaSModel => ({
  id: 'maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'maas',
  ready: true,
  url: 'https://maas.example.com/v1',
  ...overrides,
});

const mockFetchStateDefaults = {
  refresh: jest.fn(),
};

describe('useMergedModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty models when both sources are empty', () => {
    mockUseFetchAIModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });
    mockUseFetchMaaSModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    expect(result.current.models).toEqual([]);
    expect(result.current.loaded).toBe(true);
    expect(result.current.aiError).toBeUndefined();
    expect(result.current.maasError).toBeUndefined();
  });

  it('should return only AI models when no MaaS models exist', () => {
    const aiModel = createAIModel({ model_name: 'granite-7b', display_name: 'Granite 7B' });
    mockUseFetchAIModels.mockReturnValue({
      data: [aiModel],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });
    mockUseFetchMaaSModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    expect(result.current.models).toHaveLength(1);
    expect(result.current.models[0].model_name).toBe('granite-7b');
    expect(result.current.models[0].model_source_type).toBe('namespace');
  });

  it('should return only MaaS models (converted) when no AI models exist', () => {
    mockUseFetchAIModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });
    mockUseFetchMaaSModels.mockReturnValue({
      data: [createMaaSModel({ id: 'llama-2-7b-chat', display_name: 'Llama 2 Chat' })],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    expect(result.current.models).toHaveLength(1);
    expect(result.current.models[0].model_name).toBe('Llama 2 Chat');
    expect(result.current.models[0].model_source_type).toBe('maas');
  });

  it('should include both namespace and MaaS versions when the same model exists in both sources', () => {
    const namespaceModel = createAIModel({
      model_name: 'granite-7b-lab',
      model_id: 'granite-7b-lab',
      display_name: 'Granite 7B Lab',
      model_source_type: 'namespace',
    });
    const maasModel = createMaaSModel({
      id: 'granite-7b-lab',
      display_name: 'Granite 7B Lab',
      url: 'https://maas.example.com/granite-7b-lab',
    });

    mockUseFetchAIModels.mockReturnValue({
      data: [namespaceModel],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });
    mockUseFetchMaaSModels.mockReturnValue({
      data: [maasModel],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    expect(result.current.models).toHaveLength(2);

    const nsVersion = result.current.models.find((m) => m.model_source_type === 'namespace');
    const maasVersion = result.current.models.find((m) => m.model_source_type === 'maas');

    expect(nsVersion).toBeDefined();
    expect(nsVersion!.model_source_type).toBe('namespace');

    expect(maasVersion).toBeDefined();
    expect(maasVersion!.model_source_type).toBe('maas');
    expect(maasVersion!.model_id).toBe('granite-7b-lab');
  });

  it('should include all models from both sources without deduplication', () => {
    const aiModels = [
      createAIModel({ model_name: 'model-a', model_id: 'model-a' }),
      createAIModel({ model_name: 'model-b', model_id: 'model-b' }),
    ];
    const maasModels = [createMaaSModel({ id: 'model-b' }), createMaaSModel({ id: 'model-c' })];

    mockUseFetchAIModels.mockReturnValue({
      data: aiModels,
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });
    mockUseFetchMaaSModels.mockReturnValue({
      data: maasModels,
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    expect(result.current.models).toHaveLength(4);
    expect(result.current.models.map((m) => m.model_name)).toEqual([
      'model-a',
      'model-b',
      'model-b',
      'model-c',
    ]);
  });

  it('should differentiate duplicate models by modelSource', () => {
    const aiModels = [
      createAIModel({
        model_name: 'shared-model',
        model_id: 'shared-model',
        model_source_type: 'namespace',
      }),
    ];
    const maasModels = [createMaaSModel({ id: 'shared-model' })];

    mockUseFetchAIModels.mockReturnValue({
      data: aiModels,
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });
    mockUseFetchMaaSModels.mockReturnValue({
      data: maasModels,
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    const sources = result.current.models.map((m) => m.model_source_type);
    expect(sources).toEqual(['namespace', 'maas']);
  });

  describe('loading states', () => {
    it('should not be loaded until both AI and MaaS are ready', () => {
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        ...mockFetchStateDefaults,
      });
      mockUseFetchMaaSModels.mockReturnValue({
        data: [],
        loaded: false,
        error: undefined,
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(false);
    });

    it('should be loaded when AI is loaded and MaaS has an error', () => {
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        ...mockFetchStateDefaults,
      });
      mockUseFetchMaaSModels.mockReturnValue({
        data: [],
        loaded: false,
        error: new Error('MaaS unavailable'),
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(true);
    });

    it('should surface maasError separately when MaaS fails but AI succeeds', () => {
      const maasError = new Error('MaaS unavailable');
      mockUseFetchAIModels.mockReturnValue({
        data: [createAIModel({ model_name: 'ai-model' })],
        loaded: true,
        error: undefined,
        ...mockFetchStateDefaults,
      });
      mockUseFetchMaaSModels.mockReturnValue({
        data: [],
        loaded: false,
        error: maasError,
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(true);
      expect(result.current.aiError).toBeUndefined();
      expect(result.current.maasError).toBe(maasError);
      expect(result.current.models).toHaveLength(1);
      expect(result.current.models[0].model_name).toBe('ai-model');
    });

    it('should surface aiError separately when AI fails but MaaS succeeds', () => {
      const aiError = new Error('AI fetch failed');
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: false,
        error: aiError,
        ...mockFetchStateDefaults,
      });
      mockUseFetchMaaSModels.mockReturnValue({
        data: [createMaaSModel({ id: 'maas-model', display_name: 'MaaS Model' })],
        loaded: true,
        error: undefined,
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(true);
      expect(result.current.aiError).toBe(aiError);
      expect(result.current.maasError).toBeUndefined();
      expect(result.current.models).toHaveLength(1);
      expect(result.current.models[0].model_source_type).toBe('maas');
    });

    it('should surface both errors when both sources fail', () => {
      const aiError = new Error('AI fetch failed');
      const maasError = new Error('MaaS unavailable');
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: false,
        error: aiError,
        ...mockFetchStateDefaults,
      });
      mockUseFetchMaaSModels.mockReturnValue({
        data: [],
        loaded: false,
        error: maasError,
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(true);
      expect(result.current.aiError).toBe(aiError);
      expect(result.current.maasError).toBe(maasError);
      expect(result.current.models).toEqual([]);
    });
  });

  describe('refresh', () => {
    it('should call refresh on both underlying hooks', async () => {
      const refreshAI = jest.fn().mockResolvedValue(undefined);
      const refreshMaaS = jest.fn().mockResolvedValue(undefined);

      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        refresh: refreshAI,
      });
      mockUseFetchMaaSModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        refresh: refreshMaaS,
      });

      const { result } = testHook(useMergedModels)();

      await result.current.refresh();

      expect(refreshAI).toHaveBeenCalledTimes(1);
      expect(refreshMaaS).toHaveBeenCalledTimes(1);
    });

    it('should complete refresh even when one source fails (allSettled)', async () => {
      const refreshAI = jest.fn().mockResolvedValue(undefined);
      const refreshMaaS = jest.fn().mockRejectedValue(new Error('MaaS refresh failed'));

      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        refresh: refreshAI,
      });
      mockUseFetchMaaSModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        refresh: refreshMaaS,
      });

      const { result } = testHook(useMergedModels)();

      await expect(result.current.refresh()).resolves.toBeUndefined();
      expect(refreshAI).toHaveBeenCalledTimes(1);
      expect(refreshMaaS).toHaveBeenCalledTimes(1);
    });
  });
});

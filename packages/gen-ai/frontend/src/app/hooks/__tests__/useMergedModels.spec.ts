/* eslint-disable camelcase */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import useMergedModels from '~/app/hooks/useMergedModels';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import type { AIModel } from '~/app/types';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

jest.mock('~/app/hooks/useFetchAIModels');

const mockUseFetchAIModels = jest.mocked(useFetchAIModels);

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
  model_source_type: 'namespace',
  ...overrides,
});

const mockFetchStateDefaults = {
  refresh: jest.fn(),
};

describe('useMergedModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty models when fetch returns empty', () => {
    mockUseFetchAIModels.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    expect(result.current.models).toEqual([]);
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should return all models including both namespace and MaaS', () => {
    const models = [
      createAIModel({ model_name: 'granite-7b', model_source_type: 'namespace' }),
      createAIModel({
        model_name: 'llama-2',
        model_source_type: 'maas',
        serving_runtime: 'MaaS',
      }),
    ];

    mockUseFetchAIModels.mockReturnValue({
      data: models,
      loaded: true,
      error: undefined,
      ...mockFetchStateDefaults,
    });

    const { result } = testHook(useMergedModels)();

    expect(result.current.models).toHaveLength(2);
    expect(result.current.models[0].model_source_type).toBe('namespace');
    expect(result.current.models[1].model_source_type).toBe('maas');
  });

  describe('loading states', () => {
    it('should not be loaded when fetch is still loading', () => {
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: false,
        error: undefined,
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(false);
    });

    it('should be loaded when fetch completes', () => {
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(true);
    });

    it('should be loaded when fetch errors', () => {
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: false,
        error: new Error('fetch failed'),
        ...mockFetchStateDefaults,
      });

      const { result } = testHook(useMergedModels)();

      expect(result.current.loaded).toBe(true);
      expect(result.current.error).toEqual(new Error('fetch failed'));
    });
  });

  describe('refresh', () => {
    it('should delegate refresh to useFetchAIModels', () => {
      const refresh = jest.fn();
      mockUseFetchAIModels.mockReturnValue({
        data: [],
        loaded: true,
        error: undefined,
        refresh,
      });

      const { result } = testHook(useMergedModels)();

      result.current.refresh();

      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });
});

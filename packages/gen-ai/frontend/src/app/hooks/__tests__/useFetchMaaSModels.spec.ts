import { useFetchState, NotReadyError } from 'mod-arch-core';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';
import useAiAssetModelAsServiceEnabled from '~/app/hooks/useAiAssetModelAsServiceEnabled';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-shadow
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/hooks/useAiAssetModelAsServiceEnabled');

const mockUseFetchState = jest.mocked(useFetchState);
const mockUseMaaSEnabled = jest.mocked(useAiAssetModelAsServiceEnabled);
const mockUseGenAiAPI = jest.mocked(useGenAiAPI);

describe('useFetchMaaSModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenAiAPI.mockReturnValue({
      api: { getAAModels: jest.fn() } as never,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
  });

  it('should return empty array when modelAsService is disabled', async () => {
    const getAAModels = jest.fn();
    mockUseMaaSEnabled.mockReturnValue(false);
    mockUseGenAiAPI.mockReturnValue({
      api: { getAAModels } as never,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
    mockUseFetchState.mockReturnValue([[], true, undefined, jest.fn()]);

    testHook(useFetchMaaSModels)();

    const fetchCallback = mockUseFetchState.mock.calls[0][0] as () => Promise<unknown>;
    const result = await fetchCallback();
    expect(result).toEqual([]);
    expect(getAAModels).not.toHaveBeenCalled();
  });

  it('should skip fetching when API is not available', async () => {
    mockUseMaaSEnabled.mockReturnValue(true);
    mockUseGenAiAPI.mockReturnValue({
      api: { getAAModels: jest.fn() } as never,
      apiAvailable: false,
      refreshAllAPI: jest.fn(),
    });
    mockUseFetchState.mockReturnValue([[], true, undefined, jest.fn()]);

    testHook(useFetchMaaSModels)();

    const fetchCallback = mockUseFetchState.mock.calls[0][0] as () => Promise<unknown>;
    await expect(fetchCallback()).rejects.toBeInstanceOf(NotReadyError);
  });

  it('should fetch MaaS models when enabled and API is available', async () => {
    /* eslint-disable camelcase */
    const mockModels = [
      {
        model_name: 'model-1',
        model_id: 'model-1',
        serving_runtime: 'MaaS',
        api_protocol: 'OpenAI',
        version: '',
        usecase: 'LLM',
        description: '',
        endpoints: ['external: https://external.example.com', 'https://internal.example.com'],
        status: 'Running',
        display_name: 'model-1',
        sa_token: { name: '', token_name: '', token: '' },
        model_source_type: 'maas' as const,
      },
    ];
    /* eslint-enable camelcase */
    const getAAModels = jest.fn().mockResolvedValue(mockModels);
    mockUseMaaSEnabled.mockReturnValue(true);
    mockUseGenAiAPI.mockReturnValue({
      api: { getAAModels } as never,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
    mockUseFetchState.mockReturnValue([mockModels, true, undefined, jest.fn()]);

    testHook(useFetchMaaSModels)();

    const fetchCallback = mockUseFetchState.mock.calls[0][0] as (
      opts: Record<string, unknown>,
    ) => Promise<unknown>;
    const result = await fetchCallback({});
    expect(getAAModels).toHaveBeenCalledWith({ sources: 'maas' }, {});
    expect(result).toEqual(mockModels);
  });

  it('should return empty array when API returns null', async () => {
    const getAAModels = jest.fn().mockResolvedValue(null);
    mockUseMaaSEnabled.mockReturnValue(true);
    mockUseGenAiAPI.mockReturnValue({
      api: { getAAModels } as never,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
    mockUseFetchState.mockReturnValue([[], true, undefined, jest.fn()]);

    testHook(useFetchMaaSModels)();

    const fetchCallback = mockUseFetchState.mock.calls[0][0] as (
      opts: Record<string, unknown>,
    ) => Promise<unknown>;
    const result = await fetchCallback({});
    expect(result).toEqual([]);
  });
});

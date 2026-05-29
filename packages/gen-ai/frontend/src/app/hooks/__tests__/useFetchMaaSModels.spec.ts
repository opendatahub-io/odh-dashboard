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
      api: { getMaaSModels: jest.fn() } as never,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
  });

  it('should return empty array when modelAsService is disabled', async () => {
    const getMaaSModels = jest.fn();
    mockUseMaaSEnabled.mockReturnValue(false);
    mockUseGenAiAPI.mockReturnValue({
      api: { getMaaSModels } as never,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
    mockUseFetchState.mockReturnValue([[], true, undefined, jest.fn()]);

    testHook(useFetchMaaSModels)();

    const fetchCallback = mockUseFetchState.mock.calls[0][0] as () => Promise<unknown>;
    const result = await fetchCallback();
    expect(result).toEqual([]);
    expect(getMaaSModels).not.toHaveBeenCalled();
  });

  it('should skip fetching when API is not available', async () => {
    mockUseMaaSEnabled.mockReturnValue(true);
    mockUseGenAiAPI.mockReturnValue({
      api: { getMaaSModels: jest.fn() } as never,
      apiAvailable: false,
      refreshAllAPI: jest.fn(),
    });
    mockUseFetchState.mockReturnValue([[], true, undefined, jest.fn()]);

    testHook(useFetchMaaSModels)();

    const fetchCallback = mockUseFetchState.mock.calls[0][0] as () => Promise<unknown>;
    await expect(fetchCallback()).rejects.toBeInstanceOf(NotReadyError);
  });

  it('should fetch MaaS models when enabled and API is available', async () => {
    /* eslint-disable-next-line camelcase */
    const mockModels = [{ id: 'model-1', object: 'model', created: 1, owned_by: 'maas' }];
    const getMaaSModels = jest.fn().mockResolvedValue(mockModels);
    mockUseMaaSEnabled.mockReturnValue(true);
    mockUseGenAiAPI.mockReturnValue({
      api: { getMaaSModels } as never,
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    });
    mockUseFetchState.mockReturnValue([mockModels, true, undefined, jest.fn()]);

    testHook(useFetchMaaSModels)();

    const fetchCallback = mockUseFetchState.mock.calls[0][0] as (
      opts: Record<string, unknown>,
    ) => Promise<unknown>;
    const result = await fetchCallback({});
    expect(getMaaSModels).toHaveBeenCalled();
    expect(result).toEqual(mockModels);
  });

  it('should return empty array when API returns null', async () => {
    const getMaaSModels = jest.fn().mockResolvedValue(null);
    mockUseMaaSEnabled.mockReturnValue(true);
    mockUseGenAiAPI.mockReturnValue({
      api: { getMaaSModels } as never,
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

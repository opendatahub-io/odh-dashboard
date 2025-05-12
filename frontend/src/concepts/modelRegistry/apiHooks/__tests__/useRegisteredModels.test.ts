import { testHook, standardUseFetchState } from '~/__tests__/unit/testUtils/hooks';
import { useModelRegistryAPI } from '~/concepts/modelRegistry/context/ModelRegistryPageContext';
import { RegisteredModelList } from '~/concepts/modelRegistry/types';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';

// Mock the useModelRegistryAPI hook
jest.mock('~/concepts/modelRegistry/context/ModelRegistryPageContext', () => ({
  useModelRegistryAPI: jest.fn(),
}));

describe('useRegisteredModels', () => {
  const mockUseModelRegistryAPI = jest.mocked(useModelRegistryAPI);
  const mockListRegisteredModels = jest.fn();

  const mockRegisteredModelList: RegisteredModelList = {
    items: [
      {
        id: 'model-1',
        name: 'Model 1',
        createTimeSinceEpoch: '1617184844000',
        lastUpdateTimeSinceEpoch: '1617184844000',
        customProperties: {},
      },
      {
        id: 'model-2',
        name: 'Model 2',
        createTimeSinceEpoch: '1617184844000',
        lastUpdateTimeSinceEpoch: '1617184844000',
        customProperties: {},
      },
    ],
    size: 2,
    pageSize: 10,
    nextPageToken: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModelRegistryAPI.mockReturnValue({
      api: {
        listRegisteredModels: mockListRegisteredModels,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useModelRegistryAPI>);
  });

  it('should fetch and return registered models when API is available', async () => {
    mockListRegisteredModels.mockResolvedValue(mockRegisteredModelList);

    const renderResult = testHook(useRegisteredModels)();

    // Initial state
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState({ items: [], size: 0, pageSize: 0, nextPageToken: '' }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // Wait for data to be fetched
    await renderResult.waitForNextUpdate();

    // State after data fetched
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(mockRegisteredModelList, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockListRegisteredModels).toHaveBeenCalledTimes(1);
  });

  it('should handle API not being available', () => {
    mockUseModelRegistryAPI.mockReturnValue({
      api: {
        listRegisteredModels: mockListRegisteredModels,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useModelRegistryAPI>);

    const renderResult = testHook(useRegisteredModels)();

    // Initial state - with apiAvailable false, we expect the hook to stay in initial state
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState({ items: [], size: 0, pageSize: 0, nextPageToken: '' }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockListRegisteredModels).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    const error = new Error('API error');
    mockListRegisteredModels.mockRejectedValue(error);

    const renderResult = testHook(useRegisteredModels)();

    // Initial state
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState({ items: [], size: 0, pageSize: 0, nextPageToken: '' }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // Wait for the error to be caught
    await renderResult.waitForNextUpdate();

    // State after error
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState({ items: [], size: 0, pageSize: 0, nextPageToken: '' }, false, error),
    );
    expect(mockListRegisteredModels).toHaveBeenCalledTimes(1);
  });

  it('should pass options to the API call', async () => {
    mockListRegisteredModels.mockResolvedValue(mockRegisteredModelList);

    const renderResult = testHook(useRegisteredModels)();

    // Wait for data to be fetched
    await renderResult.waitForNextUpdate();

    // Verify that the API was called with the expected options
    expect(mockListRegisteredModels).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('should refresh data when refresh function is called', async () => {
    mockListRegisteredModels.mockResolvedValue(mockRegisteredModelList);

    const renderResult = testHook(useRegisteredModels)();

    // Wait for initial data fetch
    await renderResult.waitForNextUpdate();

    // Reset mock to track next call
    mockListRegisteredModels.mockClear();

    // Call refresh function
    await renderResult.result.current[3]();

    expect(mockListRegisteredModels).toHaveBeenCalledTimes(1);
  });
});

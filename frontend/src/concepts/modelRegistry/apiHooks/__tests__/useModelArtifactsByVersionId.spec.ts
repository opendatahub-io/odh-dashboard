import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import useModelArtifactsByVersionId from '#~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import { ModelArtifactList } from '#~/concepts/modelRegistry/types';
import { mockModelArtifactList } from '#~/__mocks__/mockModelArtifactList';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

// Mock the useModelRegistryAPI hook
jest.mock('#~/concepts/modelRegistry/context/ModelRegistryPageContext', () => ({
  useModelRegistryAPI: jest.fn(),
}));

const mockUseModelRegistryAPI = jest.mocked(useModelRegistryAPI);

describe('useModelArtifactsByVersionId', () => {
  const mockGetModelArtifactsByModelVersion = jest.fn();
  const defaultEmptyState: ModelArtifactList = {
    items: [],
    size: 0,
    pageSize: 0,
    nextPageToken: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModelRegistryAPI.mockReturnValue({
      api: {
        getModelArtifactsByModelVersion: mockGetModelArtifactsByModelVersion,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useModelRegistryAPI>);
  });

  it('should fetch model artifacts when modelVersionId is provided and api available', async () => {
    mockGetModelArtifactsByModelVersion.mockResolvedValue(mockModelArtifactList({}));

    const renderResult = testHook(useModelArtifactsByVersionId)('test-version-id');

    // Initial state
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState({ items: [], size: 0, pageSize: 0, nextPageToken: '' }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // Wait for data to be fetched
    await renderResult.waitForNextUpdate();

    // State after data fetched
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(mockModelArtifactList({}), true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetModelArtifactsByModelVersion).toHaveBeenCalledTimes(1);
  });

  it('should handle NotReadyError when modelVersionId is not provided', async () => {
    const renderResult = testHook(useModelArtifactsByVersionId)();
    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(defaultEmptyState));
    expect(mockGetModelArtifactsByModelVersion).not.toHaveBeenCalled();
  });

  it('should fetch model artifacts when modelVersionId is provided', async () => {
    const modelVersionId = 'test-version-id';

    mockGetModelArtifactsByModelVersion.mockResolvedValue(mockModelArtifactList({}));
    const renderResult = testHook(useModelArtifactsByVersionId)(modelVersionId);
    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(defaultEmptyState));

    // Wait for data to be fetched
    await renderResult.waitForNextUpdate();

    // Verify API was called with correct parameters
    expect(mockGetModelArtifactsByModelVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
      modelVersionId,
    );

    // Verify state was updated correctly
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(mockModelArtifactList({}), true),
    );
  });

  it('should handle errors when fetching model artifacts', async () => {
    const modelVersionId = 'test-version-id';
    const mockError = new Error('Failed to fetch model artifacts');

    mockGetModelArtifactsByModelVersion.mockRejectedValue(mockError);

    const renderResult = testHook(useModelArtifactsByVersionId)(modelVersionId);

    // Initial state before async update
    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(defaultEmptyState));

    // Wait for error to be caught
    await renderResult.waitForNextUpdate();

    // Verify API was called with correct parameters
    expect(mockGetModelArtifactsByModelVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
      modelVersionId,
    );

    // Verify error state was set correctly
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(defaultEmptyState, false, mockError),
    );
  });

  it('should not make API calls when API is not available', () => {
    jest.resetModules();
    // Set up the mocks to return a non-API state
    mockUseModelRegistryAPI.mockReturnValue({
      api: {
        getModelArtifactsByModelVersion: mockGetModelArtifactsByModelVersion,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useModelRegistryAPI>);
    const modelVersionId = 'test-version-id';
    const renderResult = testHook(useModelArtifactsByVersionId)(modelVersionId);

    // Verify the hook returned the initial state
    expect(renderResult.result.current[0]).toEqual(defaultEmptyState);

    // Verify the API was not called
    expect(mockGetModelArtifactsByModelVersion).not.toHaveBeenCalled();
  });
});

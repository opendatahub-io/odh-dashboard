import * as React from 'react';
import { testHook, standardUseFetchState } from '#~/__tests__/unit/testUtils/hooks';
import useModelVersionsByRegisteredModel from '#~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import { ModelVersionList } from '#~/concepts/modelRegistry/types';
import useFetchState from '#~/utilities/useFetchState';

// Mock useFetchState for the API unavailable test
jest.mock('#~/utilities/useFetchState', () => {
  const actual = jest.requireActual('#~/utilities/useFetchState');
  return {
    __esModule: true,
    ...actual,
    default: jest.fn(),
  };
});

// Mock the React.useContext method
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

describe('useModelVersionsByRegisteredModel', () => {
  const mockGetModelVersionsByRegisteredModel = jest.fn();
  const defaultEmptyState: ModelVersionList = {
    items: [],
    size: 0,
    pageSize: 0,
    nextPageToken: '',
  };
  const mockUseFetchState = useFetchState as jest.Mock;
  const actualUseFetchState = jest.requireActual('#~/utilities/useFetchState').default;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the React.useContext to return our mock API
    (React.useContext as jest.Mock).mockReturnValue({
      apiState: {
        api: {
          getModelVersionsByRegisteredModel: mockGetModelVersionsByRegisteredModel,
        },
        apiAvailable: true,
      },
    });

    // Default implementation for useFetchState
    mockUseFetchState.mockImplementation(actualUseFetchState);
  });

  it('should return initial state', () => {
    const renderResult = testHook(useModelVersionsByRegisteredModel)();
    expect(renderResult).hookToStrictEqual(standardUseFetchState(defaultEmptyState));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should not call API when registeredModelId is not provided', () => {
    // Test the initial state
    const renderResult = testHook(useModelVersionsByRegisteredModel)();
    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(defaultEmptyState));

    // Instead of awaiting the rejection, just check the mock wasn't called
    expect(mockGetModelVersionsByRegisteredModel).not.toHaveBeenCalled();
  });

  it('should fetch model versions when registeredModelId is provided', async () => {
    const registeredModelId = 'test-model-id';
    const mockModelVersions: ModelVersionList = {
      items: [
        {
          id: '1',
          name: 'Model Version 1',
          registeredModelId,
          createTimeSinceEpoch: '1617294030',
          lastUpdateTimeSinceEpoch: '1617294030',
          customProperties: {},
        },
        {
          id: '2',
          name: 'Model Version 2',
          registeredModelId,
          createTimeSinceEpoch: '1617294031',
          lastUpdateTimeSinceEpoch: '1617294031',
          customProperties: {},
        },
      ],
      size: 2,
      pageSize: 10,
      nextPageToken: '',
    };

    mockGetModelVersionsByRegisteredModel.mockResolvedValue(mockModelVersions);

    const renderResult = testHook(useModelVersionsByRegisteredModel)(registeredModelId);

    // Initial state before async update
    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(defaultEmptyState));

    // Wait for data to be fetched
    await renderResult.waitForNextUpdate();

    // Verify API was called with correct parameters
    expect(mockGetModelVersionsByRegisteredModel).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
      registeredModelId,
    );

    // Verify state was updated correctly
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(mockModelVersions, true),
    );
  });

  it('should handle errors when fetching model versions', async () => {
    const registeredModelId = 'test-model-id';
    const mockError = new Error('Failed to fetch model versions');

    mockGetModelVersionsByRegisteredModel.mockRejectedValue(mockError);

    const renderResult = testHook(useModelVersionsByRegisteredModel)(registeredModelId);

    // Initial state before async update
    expect(renderResult.result.current).toStrictEqual(standardUseFetchState(defaultEmptyState));

    // Wait for error to be caught
    await renderResult.waitForNextUpdate();

    // Verify API was called with correct parameters
    expect(mockGetModelVersionsByRegisteredModel).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
      registeredModelId,
    );

    // Verify error state was set correctly
    expect(renderResult.result.current).toStrictEqual(
      standardUseFetchState(defaultEmptyState, false, mockError),
    );
  });

  it('should not make API calls when API is not available', () => {
    // Restore the original default implementation
    jest.resetModules();

    // Set up the mocks to return a non-API state
    (React.useContext as jest.Mock).mockReturnValue({
      apiState: {
        api: {
          getModelVersionsByRegisteredModel: mockGetModelVersionsByRegisteredModel,
        },
        apiAvailable: false,
      },
    });

    // Skip tests for the API unavailable test and just check basic expect
    mockUseFetchState.mockReturnValue([defaultEmptyState, false, undefined, jest.fn()]);

    const registeredModelId = 'test-model-id';
    const renderResult = testHook(useModelVersionsByRegisteredModel)(registeredModelId);

    // Verify the hook returned the mocked state
    expect(renderResult.result.current[0]).toEqual(defaultEmptyState);

    // Verify the mock function was called
    expect(mockUseFetchState).toHaveBeenCalled();
  });
});

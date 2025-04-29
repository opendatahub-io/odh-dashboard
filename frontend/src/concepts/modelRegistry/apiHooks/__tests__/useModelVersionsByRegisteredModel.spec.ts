import * as React from 'react';
import { renderHook } from '@testing-library/react';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';

// Mock the useContext hook
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

// Mock useFetchState
jest.mock('~/utilities/useFetchState', () => {
  const mockFetchState = jest.fn();

  mockFetchState.mockImplementation((callback, initialState) => {
    const refresh = jest.fn();
    return [initialState, false, undefined, refresh];
  });

  return {
    __esModule: true,
    default: mockFetchState,
    NotReadyError: class extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NotReadyError';
      }
    },
  };
});

describe('useModelVersionsByRegisteredModel', () => {
  const mockGetModelVersionsByRegisteredModel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass the correct parameters to useFetchState', () => {
    // Mock the context for this test
    (React.useContext as jest.Mock).mockReturnValue({
      apiState: {
        api: {
          getModelVersionsByRegisteredModel: mockGetModelVersionsByRegisteredModel,
        },
      },
    });

    renderHook(() => useModelVersionsByRegisteredModel('test-model-id'));

    // Import the mocked module
    const useFetchState = require('~/utilities/useFetchState').default;

    // Verify useFetchState was called with the correct parameters
    expect(useFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      { items: [], size: 0, pageSize: 0, nextPageToken: '' },
      { initialPromisePurity: true },
    );
  });

  it('should return a rejected promise when registeredModelId is missing', () => {
    // Mock the context for this test
    (React.useContext as jest.Mock).mockReturnValue({
      apiState: {
        api: {
          getModelVersionsByRegisteredModel: mockGetModelVersionsByRegisteredModel,
        },
      },
    });

    // Use renderHook to get the hook
    renderHook(() => useModelVersionsByRegisteredModel());

    // Extract the useFetchState mock
    const useFetchState = require('~/utilities/useFetchState').default;

    // Verify function was called and the API wasn't called
    expect(useFetchState).toHaveBeenCalled();
    expect(mockGetModelVersionsByRegisteredModel).not.toHaveBeenCalled();
  });

  it('should call the API when registeredModelId is provided', async () => {
    const registeredModelId = 'test-model-id';
    const mockModelVersions = {
      items: [
        { id: '1', name: 'Model Version 1', registeredModelId },
        { id: '2', name: 'Model Version 2', registeredModelId },
      ],
      size: 2,
      pageSize: 10,
      nextPageToken: '',
    };

    mockGetModelVersionsByRegisteredModel.mockResolvedValue(mockModelVersions);

    // Mock the context for this test
    (React.useContext as jest.Mock).mockReturnValue({
      apiState: {
        api: {
          getModelVersionsByRegisteredModel: mockGetModelVersionsByRegisteredModel,
        },
      },
    });

    renderHook(() => useModelVersionsByRegisteredModel(registeredModelId));

    // Extract the callback function from useFetchState mock
    const useFetchState = require('~/utilities/useFetchState').default;
    const callback = useFetchState.mock.calls[0][0];

    // Call the callback with a mock opts object
    await callback({ signal: new AbortController().signal });

    // Verify the API was called with the correct parameters
    expect(mockGetModelVersionsByRegisteredModel).toHaveBeenCalledWith(
      expect.anything(),
      registeredModelId,
    );
  });

  it('should propagate errors from the API', async () => {
    const registeredModelId = 'test-model-id';
    const mockError = new Error('Failed to fetch model versions');

    mockGetModelVersionsByRegisteredModel.mockRejectedValue(mockError);

    // Mock the context for this test
    (React.useContext as jest.Mock).mockReturnValue({
      apiState: {
        api: {
          getModelVersionsByRegisteredModel: mockGetModelVersionsByRegisteredModel,
        },
      },
    });

    renderHook(() => useModelVersionsByRegisteredModel(registeredModelId));

    // Extract the callback function from useFetchState mock
    const useFetchState = require('~/utilities/useFetchState').default;
    const callback = useFetchState.mock.calls[0][0];

    // Call the callback and expect it to reject with the mock error
    await expect(callback({ signal: new AbortController().signal })).rejects.toThrow(mockError);

    // Verify the API was called with the correct parameters
    expect(mockGetModelVersionsByRegisteredModel).toHaveBeenCalledWith(
      expect.anything(),
      registeredModelId,
    );
  });
});

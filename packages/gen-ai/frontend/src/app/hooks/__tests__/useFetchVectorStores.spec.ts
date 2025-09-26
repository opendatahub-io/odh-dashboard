// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { useFetchState } from 'mod-arch-core';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { getVectorStores } from '~/app/services/llamaStackService';
import { VectorStore } from '~/app/types';
import { mockVectorStores } from '~/__mocks__/mockVectorStores';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

// Mock mod-arch-core to avoid React context issues
jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

// Mock the llamaStackService
jest.mock('~/app/services/llamaStackService', () => ({
  getVectorStores: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetVectorStores = jest.mocked(getVectorStores);

describe('useFetchVectorStores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return NotReadyError when namespace is not provided', async () => {
    // Mock useFetchState to return error state
    const mockError = new Error('Namespace not found');
    mockUseFetchState.mockReturnValue([[], false, mockError, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)();

    await waitFor(() => {
      const [, , error] = result.current;
      expect(error?.message).toBe('Namespace not found');
      expect(error).toBeInstanceOf(Error);
    });

    // Verify getVectorStores was not called
    expect(mockGetVectorStores).not.toHaveBeenCalled();
  });

  it('should return NotReadyError when namespace is undefined', async () => {
    // Mock useFetchState to return error state
    const mockError = new Error('Namespace not found');
    mockUseFetchState.mockReturnValue([[], false, mockError, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(undefined);

    await waitFor(() => {
      const [, , error] = result.current;
      expect(error?.message).toBe('Namespace not found');
      expect(error).toBeInstanceOf(Error);
    });

    // Verify getVectorStores was not called
    expect(mockGetVectorStores).not.toHaveBeenCalled();
  });

  it('should return NotReadyError when namespace is empty string', async () => {
    // Mock useFetchState to return error state
    const mockError = new Error('Namespace not found');
    mockUseFetchState.mockReturnValue([[], false, mockError, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)('');

    await waitFor(() => {
      const [, , error] = result.current;
      expect(error?.message).toBe('Namespace not found');
      expect(error).toBeInstanceOf(Error);
    });

    // Verify getVectorStores was not called
    expect(mockGetVectorStores).not.toHaveBeenCalled();
  });

  it('should fetch vector stores successfully when namespace is provided', async () => {
    const testNamespace = 'test-namespace';

    // Mock successful service response
    mockGetVectorStores.mockResolvedValue(mockVectorStores);

    // Mock useFetchState to return success state
    mockUseFetchState.mockReturnValue([mockVectorStores, true, undefined, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(testNamespace);

    await waitFor(() => {
      const [data, loaded, error] = result.current;
      expect(data).toEqual(mockVectorStores);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should handle service error when fetching vector stores', async () => {
    const testNamespace = 'test-namespace';
    const serviceError = new Error('Failed to fetch vector stores');

    // Mock service to throw error
    mockGetVectorStores.mockRejectedValue(serviceError);

    // Mock useFetchState to return error state
    mockUseFetchState.mockReturnValue([[], false, serviceError, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(testNamespace);

    await waitFor(() => {
      const [data, loaded, error] = result.current;
      expect(data).toEqual([]);
      expect(loaded).toBe(false);
      expect(error?.message).toBe('Failed to fetch vector stores');
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('should handle loading state during fetch operation', async () => {
    const testNamespace = 'test-namespace';

    // Mock service to return promise
    mockGetVectorStores.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockVectorStores), 100);
        }),
    );

    // Mock useFetchState to return loading state initially
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(testNamespace);

    // Check initial loading state
    const [initialData, initialLoaded, initialError] = result.current;
    expect(initialData).toEqual([]);
    expect(initialLoaded).toBe(false);
    expect(initialError).toBeUndefined();
  });

  it('should return empty array as default value', async () => {
    const testNamespace = 'test-namespace';

    // Mock useFetchState to return default state
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(testNamespace);

    const [data, loaded, error] = result.current;
    expect(data).toEqual([]);
    expect(loaded).toBe(false);
    expect(error).toBeUndefined();
  });

  it('should handle single vector store response', async () => {
    const testNamespace = 'test-namespace';
    const singleVectorStoreArray = [mockVectorStores[0]];

    // Mock successful service response with single item
    mockGetVectorStores.mockResolvedValue(singleVectorStoreArray);

    // Mock useFetchState to return success state
    mockUseFetchState.mockReturnValue([singleVectorStoreArray, true, undefined, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(testNamespace);

    await waitFor(() => {
      const [data, loaded, error] = result.current;
      expect(data).toEqual(singleVectorStoreArray);
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual(mockVectorStores[0]);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should handle empty vector stores response', async () => {
    const testNamespace = 'test-namespace';
    const emptyResponse: VectorStore[] = [];

    // Mock successful service response with empty array
    mockGetVectorStores.mockResolvedValue(emptyResponse);

    // Mock useFetchState to return success state with empty data
    mockUseFetchState.mockReturnValue([emptyResponse, true, undefined, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(testNamespace);

    await waitFor(() => {
      const [data, loaded, error] = result.current;
      expect(data).toEqual([]);
      expect(data).toHaveLength(0);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should handle network timeout error', async () => {
    const testNamespace = 'test-namespace';
    const timeoutError = new Error('Request timeout');

    // Mock service to throw timeout error
    mockGetVectorStores.mockRejectedValue(timeoutError);

    // Mock useFetchState to return error state
    mockUseFetchState.mockReturnValue([[], false, timeoutError, jest.fn()]);

    const { result } = testHook(useFetchVectorStores)(testNamespace);

    await waitFor(() => {
      const [data, loaded, error] = result.current;
      expect(data).toEqual([]);
      expect(loaded).toBe(false);
      expect(error?.message).toBe('Request timeout');
      expect(error).toBeInstanceOf(Error);
    });
  });
});

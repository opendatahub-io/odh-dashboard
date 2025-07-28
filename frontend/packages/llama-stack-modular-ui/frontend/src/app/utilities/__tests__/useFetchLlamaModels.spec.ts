/* eslint-disable camelcase */
import { renderHook, waitFor, act } from '@testing-library/react';
import { mockLlamaModels } from '~/src/__mocks__/llamaStackModels';
import { listModels } from '@app/services/llamaStackService';
import useFetchLlamaModels from '@app/utilities/useFetchLlamaModels';

// Mock the llamaStackService
jest.mock('@app/services/llamaStackService', () => ({
  listModels: jest.fn(),
}));

const mockedListModels = listModels as jest.MockedFunction<typeof listModels>;

describe('useFetchLlamaModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return initial state values', () => {
    const { result } = renderHook(() => useFetchLlamaModels());

    expect(result.current.models).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isPermissionError).toBe(false);
    expect(typeof result.current.fetchLlamaModels).toBe('function');
  });

  describe('fetchLlamaModels - success scenarios', () => {
    it('should fetch models successfully', async () => {
      mockedListModels.mockResolvedValue(mockLlamaModels);

      const { result } = renderHook(() => useFetchLlamaModels());

      // Trigger the fetch
      act(() => {
        result.current.fetchLlamaModels();
      });

      // Wait for the fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.models).toEqual(mockLlamaModels);
      expect(result.current.error).toBe(null);
      expect(result.current.isPermissionError).toBe(false);
      expect(mockedListModels).toHaveBeenCalledTimes(1);
    });

    it('should clear previous errors when fetching successfully', async () => {
      mockedListModels
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockLlamaModels);

      const { result } = renderHook(() => useFetchLlamaModels());

      // First call - error
      act(() => {
        result.current.fetchLlamaModels();
      });
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.error).toBe('Network error');

      // Second call - success
      act(() => {
        result.current.fetchLlamaModels();
      });
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.models).toEqual(mockLlamaModels);
      expect(result.current.error).toBe(null);
      expect(result.current.isPermissionError).toBe(false);
    });
  });

  describe('fetchLlamaModels - error scenarios', () => {
    it('should handle general errors', async () => {
      const errorMessage = 'Network connection failed';
      mockedListModels.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useFetchLlamaModels());

      act(() => {
        result.current.fetchLlamaModels();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.models).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isPermissionError).toBe(false);
    });

    it('should handle non-Error objects', async () => {
      mockedListModels.mockRejectedValue('String error');

      const { result } = renderHook(() => useFetchLlamaModels());

      act(() => {
        result.current.fetchLlamaModels();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.models).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch models');
      expect(result.current.isPermissionError).toBe(false);
    });
  });

  describe('fetchLlamaModels - permission error scenarios', () => {
    it('should handle 401 permission errors', async () => {
      const error = new Error('Permission denied') as Error & { status: number };
      error.status = 401;
      mockedListModels.mockRejectedValue(error);

      const { result } = renderHook(() => useFetchLlamaModels());

      act(() => {
        result.current.fetchLlamaModels();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.models).toEqual([]);
      expect(result.current.error).toBe('Permission denied');
      expect(result.current.isPermissionError).toBe(true);
    });

    it('should handle 403 permission errors', async () => {
      const error = new Error('Forbidden access') as Error & { status: number };
      error.status = 403;
      mockedListModels.mockRejectedValue(error);

      const { result } = renderHook(() => useFetchLlamaModels());

      act(() => {
        result.current.fetchLlamaModels();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.models).toEqual([]);
      expect(result.current.error).toBe('Forbidden access');
      expect(result.current.isPermissionError).toBe(true);
    });
  });
});

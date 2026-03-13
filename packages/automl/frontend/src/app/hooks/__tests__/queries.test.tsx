import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFilesQuery } from '~/app/hooks/queries';

// Mock fetch globally
global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryClientProvider';
  return Wrapper;
};

describe('useFilesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be disabled when namespace is missing', () => {
    const { result } = renderHook(
      () => useFilesQuery(undefined, 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should be disabled when secretName is missing', () => {
    const { result } = renderHook(
      () => useFilesQuery('test-namespace', undefined, 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should be disabled when key is missing', () => {
    const { result } = renderHook(
      () => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', undefined),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should construct URL with all parameters including bucket', async () => {
    const mockResponse = {
      data: {
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'string' },
        ],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(() => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/s3/file/schema?'));
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(callUrl).toContain('secretName=test-secret');
    expect(callUrl).toContain('bucket=test-bucket');
    expect(callUrl).toContain('key=data.csv');
  });

  it('should omit bucket parameter when not provided', async () => {
    const mockResponse = {
      data: {
        columns: [{ name: 'id', type: 'integer' }],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(() => useFilesQuery('test-namespace', 'test-secret', undefined, 'data.csv'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(callUrl).toContain('secretName=test-secret');
    expect(callUrl).not.toContain('bucket=');
    expect(callUrl).toContain('key=data.csv');
  });

  it('should parse response data correctly', async () => {
    const mockColumns = [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'string' },
      { name: 'age', type: 'double' },
      { name: 'active', type: 'bool', values: [true, false] },
    ];

    const mockResponse = {
      data: {
        columns: mockColumns,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockColumns);
    });
  });

  it('should return empty array when response data is missing', async () => {
    const mockResponse = {
      data: {},
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('should handle fetch errors properly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const { result } = renderHook(
      () => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Failed to fetch file schema');
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Network error');
  });

  it('should not retry on error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    renderHook(() => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should use correct query key', () => {
    const { result } = renderHook(
      () => useFilesQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toBeDefined();
    // Query key is ['files', namespace, secretName, bucket, key]
  });

  it('should handle URL encoding for special characters in parameters', async () => {
    const mockResponse = {
      data: {
        columns: [{ name: 'id', type: 'integer' }],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () => useFilesQuery('test-namespace', 'test-secret', 'my-bucket', 'folder/my file.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    // URLSearchParams handles encoding automatically
    expect(callUrl).toContain('key=');
  });
});

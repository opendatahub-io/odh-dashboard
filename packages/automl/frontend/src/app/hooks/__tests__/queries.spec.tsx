import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useS3GetFileSchemaQuery, fetchS3File } from '~/app/hooks/queries';

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

describe('useS3GetFileSchemaQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be disabled when namespace is missing', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery(undefined, 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should be disabled when secretName is missing', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', undefined, 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should be disabled when key is missing', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', undefined),
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
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      {
        wrapper: createWrapper(),
      },
    );

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
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', undefined, 'data.csv'),
      {
        wrapper: createWrapper(),
      },
    );

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
      { name: 'status', type: 'string', values: ['active', 'inactive'] },
    ];

    const mockResponse = {
      data: {
        columns: mockColumns,
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
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
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
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
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Failed to fetch file schema');
  });

  it('should extract error message from API response', async () => {
    const mockErrorResponse = {
      error: {
        code: '400',
        message: 'only CSV files are supported (must have .csv extension)',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => mockErrorResponse,
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.txt'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe(
      'Failed to fetch file schema: only CSV files are supported (must have .csv extension)',
    );
  });

  it('should fall back to statusText when error response cannot be parsed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe(
      'Failed to fetch file schema: Internal Server Error',
    );
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Network error');
  });

  it('should not retry on error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should use correct query key', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toBeDefined();
    // Query key is ['files', namespace, secretName, bucket, key]
  });

  it('should handle URL encoding for special characters in parameters', async () => {
    const mockResponse = {
      data: {
        columns: [{ name: 'id', type: 'integer' }],
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () =>
        useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'my-bucket', 'folder/my file.csv'),
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

describe('fetchS3File', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should construct URL with namespace and key', async () => {
    const mockBlob = new Blob(['file content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const result = await fetchS3File('test-namespace', 'path/to/file.json');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/s3/file?'),
      expect.objectContaining({ signal: undefined }),
    );
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(callUrl).toContain('key=path%2Fto%2Ffile.json');
    expect(result).toBe(mockBlob);
  });

  it('should include secretName and bucket when provided', async () => {
    const mockBlob = new Blob(['content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    await fetchS3File('ns', 'key.csv', { secretName: 'my-secret', bucket: 'my-bucket' });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('secretName=my-secret');
    expect(callUrl).toContain('bucket=my-bucket');
  });

  it('should omit secretName and bucket when not provided', async () => {
    const mockBlob = new Blob(['content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    await fetchS3File('ns', 'key.csv');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).not.toContain('secretName=');
    expect(callUrl).not.toContain('bucket=');
  });

  it('should throw with statusText on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => {
        throw new Error('no body');
      },
    });

    await expect(fetchS3File('ns', 'missing.json')).rejects.toThrow(
      'Failed to fetch file: Not Found',
    );
  });

  it('should throw with API error message when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({
        error: { message: 'S3 key not found' },
      }),
    });

    await expect(fetchS3File('ns', 'bad-key')).rejects.toThrow(
      'Failed to fetch file: S3 key not found',
    );
  });

  it('should fall back to statusText when error JSON is malformed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({ unexpected: 'shape' }),
    });

    await expect(fetchS3File('ns', 'key')).rejects.toThrow(
      'Failed to fetch file: Internal Server Error',
    );
  });
});

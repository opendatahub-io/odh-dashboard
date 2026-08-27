/* eslint-disable camelcase -- S3ListObjectsResponse uses snake_case to match BFF API */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { S3Api } from '../../../api/s3';
import { AutoXApiProvider } from '../../../context';
import { useS3ListFilesQuery } from '../useS3ListFilesQuery';

const mockS3Api: S3Api = {
  uploadFileToS3: jest.fn(),
  getFiles: jest.fn(),
  fetchS3File: jest.fn(),
  fetchS3Json: jest.fn(),
};

jest.mock('../../../api', () => ({
  ...jest.requireActual('../../../api'),
  createS3Api: jest.fn(() => mockS3Api),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      AutoXApiProvider,
      {
        api: { k8s: {} as never, s3: mockS3Api, pipelines: {} as never },
      },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
  return Wrapper;
};

describe('useS3ListFilesQuery', () => {
  const getFiles = jest.mocked(mockS3Api.getFiles);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be disabled when namespace is undefined', () => {
    const { result } = renderHook(() => useS3ListFilesQuery(undefined, 'path'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getFiles).not.toHaveBeenCalled();
  });

  it('should be disabled when path is undefined', () => {
    const { result } = renderHook(() => useS3ListFilesQuery('ns', undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getFiles).not.toHaveBeenCalled();
  });

  it('should fetch files when namespace and path are provided', async () => {
    const mockResponse = {
      common_prefixes: [],
      contents: [{ key: 'file.csv', size: 10 }],
      is_truncated: false,
      key_count: 1,
      max_keys: 1000,
    };
    getFiles.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useS3ListFilesQuery('ns', 'path/'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(getFiles).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      { namespace: 'ns', path: 'path/' },
    );
  });

  it('should surface fetch errors', async () => {
    const fetchError = new Error('failed to list files');
    getFiles.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useS3ListFilesQuery('ns', 'path/'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(fetchError);
  });
});

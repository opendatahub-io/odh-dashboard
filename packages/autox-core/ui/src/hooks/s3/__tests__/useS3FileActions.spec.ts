/* eslint-disable camelcase -- S3 response fixtures match the BFF contract */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import type { S3Api } from '../../../api/s3/s3';
import { AutoXApiProvider } from '../../../context/AutoXApiContext';
import { useS3CacheActions, useS3FileOperations } from '../useS3FileFetchers';

const mockS3Api: S3Api = {
  uploadFileToS3: jest.fn(),
  getFiles: jest.fn(),
  fetchS3File: jest.fn(),
  fetchS3Json: jest.fn(),
};

jest.mock('../../../api/s3/s3', () => ({
  ...jest.requireActual('../../../api/s3/s3'),
  createS3Api: jest.fn(() => mockS3Api),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AutoXApiProvider, { apiPrefix: '/test', bffApiVersion: 'v1' }, children),
    );
  return { Wrapper, queryClient };
};

describe('useS3CacheActions and useS3FileOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates only the requested namespace across file, JSON, and raw-file queries', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['s3Files', 'ns', 'path'], {});
    queryClient.setQueryData(['s3Json', 'ns', 'file.json', 'secret', 'bucket', 'schema', 10], {});
    queryClient.setQueryData(['s3File', 'ns', 'file.json'], {});
    queryClient.setQueryData(['s3Files', 'other-ns', 'path'], {});

    const { result } = renderHook(() => useS3CacheActions(), { wrapper: Wrapper });
    await result.current.invalidateS3Results('ns');

    expect(queryClient.getQueryState(['s3Files', 'ns', 'path'])?.isInvalidated).toBe(true);
    expect(
      queryClient.getQueryState(['s3Json', 'ns', 'file.json', 'secret', 'bucket', 'schema', 10])
        ?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(['s3File', 'ns', 'file.json'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['s3Files', 'other-ns', 'path'])?.isInvalidated).toBe(false);
  });

  it('lists files imperatively with the caller-provided cancellation signal', async () => {
    const response = {
      common_prefixes: [],
      contents: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    };
    const getFiles = jest.mocked(mockS3Api.getFiles).mockResolvedValue(response);
    const controller = new AbortController();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileOperations(), { wrapper: Wrapper });

    await expect(result.current.listS3Files('ns', 'path', controller.signal)).resolves.toEqual(
      response,
    );
    expect(getFiles).toHaveBeenCalledWith(
      '',
      { signal: controller.signal },
      { namespace: 'ns', path: 'path' },
    );
  });
});

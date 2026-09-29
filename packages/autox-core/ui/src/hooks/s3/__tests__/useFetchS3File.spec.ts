import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { S3Api } from '../../../api/s3/s3';
import { AutoXApiProvider } from '../../../context/AutoXApiContext';
import { useFetchS3File } from '../useFetchS3File';

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AutoXApiProvider, { apiPrefix: '/test', bffApiVersion: 'v1' }, children),
    );
  return { Wrapper, queryClient };
};

describe('useFetchS3File', () => {
  const fetchS3File = jest.mocked(mockS3Api.fetchS3File);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should download through the provider-backed API with the requested options', async () => {
    const blob = new Blob(['file contents']);
    fetchS3File.mockResolvedValue(blob);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFetchS3File(), { wrapper: Wrapper });

    await expect(
      result.current('project-a', 'reports/output.csv', {
        secretName: 's3-secret',
        bucket: 'results',
        view: 'raw',
        maxBytes: 1024,
      }),
    ).resolves.toBe(blob);

    expect(fetchS3File).toHaveBeenCalledWith(
      'project-a',
      'reports/output.csv',
      expect.objectContaining({
        secretName: 's3-secret',
        bucket: 'results',
        view: 'raw',
        maxBytes: 1024,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('should surface provider errors', async () => {
    const providerError = new Error('download failed');
    fetchS3File.mockRejectedValue(providerError);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFetchS3File(), { wrapper: Wrapper });

    await expect(result.current('project-a', 'reports/output.csv')).rejects.toBe(providerError);
  });

  it('should abort the provider request when the query is cancelled', async () => {
    const providerError = new Error('download failed');
    let requestSignal: AbortSignal | undefined;
    fetchS3File.mockImplementation(
      async (_namespace, _key, options) =>
        new Promise<Blob>((_resolve, reject) => {
          requestSignal = options?.signal;
          options?.signal?.addEventListener('abort', () => reject(providerError), { once: true });
        }),
    );
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useFetchS3File(), { wrapper: Wrapper });
    const download = result.current('project-a', 'reports/output.csv');

    await waitFor(() => expect(requestSignal).toBeDefined());
    await queryClient.cancelQueries({
      queryKey: ['s3Download', 'project-a', 'reports/output.csv'],
    });

    expect(requestSignal?.aborted).toBe(true);
    await expect(download).rejects.toBeDefined();
  });

  it('should abort the provider request when the caller signal is cancelled', async () => {
    const providerError = new Error('download cancelled');
    let requestSignal: AbortSignal | undefined;
    fetchS3File.mockImplementation(
      async (_namespace, _key, options) =>
        new Promise<Blob>((_resolve, reject) => {
          requestSignal = options?.signal;
          options?.signal?.addEventListener('abort', () => reject(providerError), { once: true });
        }),
    );
    const callerController = new AbortController();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFetchS3File(), { wrapper: Wrapper });
    const download = result.current('project-a', 'reports/output.csv', {
      signal: callerController.signal,
    });

    await waitFor(() => expect(requestSignal).toBeDefined());
    callerController.abort();

    expect(requestSignal?.aborted).toBe(true);
    await expect(download).rejects.toBe(providerError);
  });
});

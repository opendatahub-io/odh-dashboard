import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import * as z from 'zod';
import type { S3Api } from '../../../api/s3/s3';
import { AutoXApiProvider } from '../../../context/AutoXApiContext';
import { useS3CacheActions, useS3FileFetchers } from '../useS3FileFetchers';

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

describe('useS3FileFetchers', () => {
  const fetchS3File = jest.mocked(mockS3Api.fetchS3File);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should share raw file reads through a complete query key', async () => {
    const blob = new Blob(['content']);
    fetchS3File.mockResolvedValue(blob);
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    await result.current.fetchS3File('namespace', 'file.csv', {
      secretName: 'secret',
      bucket: 'bucket',
      view: 'raw',
      maxBytes: 100,
    });
    await result.current.fetchS3File('namespace', 'file.csv', {
      secretName: 'secret',
      bucket: 'bucket',
      view: 'raw',
      maxBytes: 100,
    });

    expect(fetchS3File).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(['s3File', 'namespace', 'file.csv', 'secret', 'bucket', 'raw', 100]),
    ).toBe(blob);
  });

  it('should cache raw JSON and parse it with each supplied schema', async () => {
    fetchS3File.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ value: 1 })),
    } as unknown as Blob);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const firstSchema = await result.current.fetchS3Json('namespace', 'data.json', {
      schema: z.object({ value: z.number() }),
    });
    const secondSchema = await result.current.fetchS3Json('namespace', 'data.json', {
      schema: z.object({ value: z.number().transform(String) }),
    });

    expect(firstSchema).toEqual({ value: 1 });
    expect(secondSchema).toEqual({ value: '1' });
    expect(fetchS3File).toHaveBeenCalledTimes(1);
  });

  it('should forward an imperative download signal and cache the result', async () => {
    const blob = new Blob(['content']);
    fetchS3File.mockResolvedValue(blob);
    const controller = new AbortController();
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    await result.current.fetchS3File('namespace', 'file.csv', { signal: controller.signal });

    expect(fetchS3File).toHaveBeenCalledWith(
      'namespace',
      'file.csv',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      queryClient.getQueryData([
        's3File',
        'namespace',
        'file.csv',
        undefined,
        undefined,
        undefined,
        undefined,
      ]),
    ).toBe(blob);
  });

  it('should refetch JSON after the scoped cache action invalidates it', async () => {
    fetchS3File
      .mockResolvedValueOnce({
        text: () => Promise.resolve(JSON.stringify({ name: 'stale-model' })),
      } as Blob)
      .mockResolvedValueOnce({
        text: () => Promise.resolve(JSON.stringify({ name: 'fresh-model' })),
      } as Blob);
    const { Wrapper } = createWrapper();
    const { result: fetchers } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const { result: actions } = renderHook(() => useS3CacheActions(), { wrapper: Wrapper });

    await expect(fetchers.current.fetchS3Json('namespace', 'models/model.json')).resolves.toEqual({
      name: 'stale-model',
    });
    await actions.current.invalidateS3JsonCache('namespace', 'models/model.json');
    await expect(fetchers.current.fetchS3Json('namespace', 'models/model.json')).resolves.toEqual({
      name: 'fresh-model',
    });

    await waitFor(() => expect(fetchS3File).toHaveBeenCalledTimes(2));
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import * as z from 'zod';
import type { S3Api } from '../../../api/s3';
import { AutoXApiProvider } from '../../../context';
import { useS3FileFetchers } from '../useS3FileFetchers';

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
});

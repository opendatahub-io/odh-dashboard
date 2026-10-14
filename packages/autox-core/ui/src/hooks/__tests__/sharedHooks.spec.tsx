/* eslint-disable camelcase -- API response fixtures use snake_case */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { K8sApi } from '../../api/k8s/k8s';
import type { PipelinesApi } from '../../api/pipelines/pipelines';
import type { S3Api } from '../../api/s3/s3';
import { useAutoXApi } from '../../context/AutoXApiContext';
import {
  useCreateSecretMutation,
  useEnableManagedPipelinesMutation,
  usePipelineServerReadinessQuery,
  useSecretsQuery,
  useS3ListFilesQuery,
} from '../index';

jest.mock('../../context/AutoXApiContext', () => ({ useAutoXApi: jest.fn() }));
const k8sApi = { getSecrets: jest.fn() } as unknown as K8sApi;
const pipelinesApi = {
  getPipelineRunsFromBFF: jest.fn(),
  enableManagedPipelines: jest.fn(),
} as unknown as PipelinesApi;
const s3Api = { getFiles: jest.fn() } as unknown as S3Api;
const api = { k8s: { ...k8sApi, createSecret: jest.fn() }, pipelines: pipelinesApi, s3: s3Api };
const useAutoXApiMock = jest.mocked(useAutoXApi);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('shared AutoX hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAutoXApiMock.mockReturnValue(api);
  });

  it('should list secrets and forward the request signal', async () => {
    const getSecrets = jest.mocked(k8sApi.getSecrets);
    const getSecretsRequest = jest.fn().mockResolvedValue([]);
    const getSecretsRequestFactory = jest.fn(() => getSecretsRequest);
    getSecrets.mockReturnValue(getSecretsRequestFactory as never);
    const { result } = renderHook(() => useSecretsQuery('ns', 'storage'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getSecrets).toHaveBeenCalledWith('');
    expect(getSecretsRequest).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it('should include the provider in the secret query and request', async () => {
    const getSecrets = jest.mocked(k8sApi.getSecrets);
    const getSecretsRequest = jest.fn().mockResolvedValue([]);
    const getSecretsRequestFactory = jest.fn(() => getSecretsRequest);
    getSecrets.mockReturnValue(getSecretsRequestFactory as never);

    const { result } = renderHook(() => useSecretsQuery('ns', 'database', 'neo4j'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getSecrets).toHaveBeenCalledWith('');
    expect(getSecretsRequestFactory).toHaveBeenCalledWith('ns', 'database', 'neo4j');
  });

  it('should create secrets through the mutation hook', async () => {
    const createSecretMock = jest.mocked(api.k8s.createSecret);
    createSecretMock.mockResolvedValue({} as never);
    const mutation = renderHook(() => useCreateSecretMutation(), { wrapper });
    await mutation.result.current.mutateAsync({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'secret', namespace: 'ns' },
    });
    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { name: 'secret', namespace: 'ns' } }),
    );
  });

  it('should forward readiness signals and classify transient errors as not ready', async () => {
    const getRuns = jest.mocked(pipelinesApi.getPipelineRunsFromBFF);
    getRuns.mockResolvedValue({ runs: [], total_size: 0, next_page_token: '' });
    jest.useFakeTimers();
    const { result } = renderHook(() => usePipelineServerReadinessQuery('ns', () => false), {
      wrapper,
    });
    expect(getRuns).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(4999));
    expect(getRuns).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    await waitFor(() => expect(result.current.data).toBe(true));
    expect(getRuns.mock.calls[0]?.[2]).toEqual({ signal: expect.any(AbortSignal) });
    jest.useRealTimers();
  });

  it('should call enable mutation and invalidate readiness queries', async () => {
    const enable = jest.mocked(pipelinesApi.enableManagedPipelines);
    enable.mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const mutation = renderHook(() => useEnableManagedPipelinesMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await mutation.result.current.mutateAsync('ns');
    expect(enable).toHaveBeenCalledWith('', 'ns');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipelineServerReadiness', 'ns'] });
  });

  it('should list S3 files with the configured provider client', async () => {
    const getFiles = jest.mocked(s3Api.getFiles);
    getFiles.mockResolvedValue({
      common_prefixes: [],
      contents: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    });
    const { result } = renderHook(() => useS3ListFilesQuery('ns', 'path'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getFiles).toHaveBeenCalledWith(
      '',
      { signal: expect.any(AbortSignal) },
      {
        namespace: 'ns',
        path: 'path',
      },
    );
  });
});

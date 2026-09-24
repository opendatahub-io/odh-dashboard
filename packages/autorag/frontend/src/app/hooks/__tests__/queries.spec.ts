import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import {
  fetchS3File,
  fetchS3Json,
  useMaaSModelsQuery,
} from '~/app/hooks/queries';
import { useSecretCredentialsQuery } from '../useSecretCredentialsQuery';
import { getMaaSModels, getSecretByName } from '~/app/api/k8s';

jest.mock('~/app/api/k8s', () => ({
  getMaaSModels: jest.fn(),
  getSecretByName: jest.fn(),
}));

const getMaaSModelsMock = jest.mocked(getMaaSModels);
const getSecretByNameMock = jest.mocked(getSecretByName);

global.fetch = jest.fn();

describe('useSecretCredentialsQuery', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be disabled when namespace is undefined', () => {
    const { result } = renderHook(() => useSecretCredentialsQuery(undefined, 'secret'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(getSecretByNameMock).not.toHaveBeenCalled();
  });

  it('should be disabled when secretName is undefined', () => {
    const { result } = renderHook(() => useSecretCredentialsQuery('ns', undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(getSecretByNameMock).not.toHaveBeenCalled();
  });

  it('should be disabled when both params are undefined', () => {
    const { result } = renderHook(() => useSecretCredentialsQuery(undefined, undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(getSecretByNameMock).not.toHaveBeenCalled();
  });

  it('should fetch when both namespace and secretName are provided', async () => {
    const mockData = { OGX_CLIENT_API_KEY: 'key', OGX_CLIENT_BASE_URL: 'url' };
    getSecretByNameMock.mockReturnValue((() => () => Promise.resolve(mockData)) as never);

    const { result } = renderHook(() => useSecretCredentialsQuery('test-ns', 'my-secret'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should return error when fetch fails', async () => {
    getSecretByNameMock.mockReturnValue(
      (() => () => Promise.reject(new Error('Not found'))) as never,
    );

    const { result } = renderHook(() => useSecretCredentialsQuery('test-ns', 'bad-secret'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Not found');
  });
});

describe('useMaaSModelsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reuse the prefetched result when another observer mounts', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    const models = {
      models: [{ id: 'llama-3-8b', ready: true }],
    };
    getMaaSModelsMock.mockReturnValue((() => () => Promise.resolve(models)) as never);

    const firstObserver = renderHook(() => useMaaSModelsQuery('test-ns', 'maas-secret'), {
      wrapper: Wrapper,
    });
    await waitFor(() => {
      expect(firstObserver.result.current.isSuccess).toBe(true);
    });

    const secondObserver = renderHook(() => useMaaSModelsQuery('test-ns', 'maas-secret'), {
      wrapper: Wrapper,
    });
    expect(secondObserver.result.current.data).toEqual(models);
    expect(getMaaSModelsMock).toHaveBeenCalledTimes(1);
  });

  it('should settle into usable model data when the first request fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, retryDelay: 0 } },
    });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    const models = {
      models: [{ id: 'llama-3-8b', ready: true }],
    };
    const request = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(models);
    getMaaSModelsMock.mockReturnValue((() => request) as never);

    const { result } = renderHook(() => useMaaSModelsQuery('test-ns', 'maas-secret'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(models);
    expect(request).toHaveBeenCalledTimes(2);
  });
});

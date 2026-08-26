import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useOgxModelsQuery, useSecretCredentialsQuery } from '~/app/hooks/queries';
import { getOgxModels, getSecretByName } from '~/app/api/k8s';

jest.mock('~/app/api/k8s', () => ({
  getOgxModels: jest.fn(),
  getSecretByName: jest.fn(),
}));

const getOgxModelsMock = jest.mocked(getOgxModels);
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

describe('useOgxModelsQuery', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    return Wrapper;
  };

  const mockModel = (id: string, type: string) => ({
    id,
    type,
    provider: 'openai',
    resource_path: `/${id}`, // eslint-disable-line camelcase
  });

  const mockModelsResponse = (models: ReturnType<typeof mockModel>[]) => {
    getOgxModelsMock.mockReturnValue((() => () => Promise.resolve({ models })) as never);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be disabled when namespace is empty', () => {
    const { result } = renderHook(() => useOgxModelsQuery('', 'secret'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should be disabled when secretName is empty', () => {
    const { result } = renderHook(() => useOgxModelsQuery('ns', ''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should return only llm and embedding models', async () => {
    mockModelsResponse([mockModel('model-1', 'llm'), mockModel('model-2', 'embedding')]);

    const { result } = renderHook(() => useOgxModelsQuery('ns', 'secret'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.models).toHaveLength(2);
    expect(result.current.data?.models.map((m) => m.id)).toEqual(['model-1', 'model-2']);
  });

  it('should filter out unknown model types', async () => {
    mockModelsResponse([
      mockModel('llm-1', 'llm'),
      mockModel('reranker-1', 'reranker'),
      mockModel('embed-1', 'embedding'),
      mockModel('speech-1', 'speech-to-text'),
    ]);

    const { result } = renderHook(() => useOgxModelsQuery('ns', 'secret'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.models).toHaveLength(2);
    expect(result.current.data?.models.map((m) => m.id)).toEqual(['llm-1', 'embed-1']);
  });

  it('should return empty models when all types are unknown', async () => {
    mockModelsResponse([mockModel('reranker-1', 'reranker'), mockModel('tts-1', 'text-to-speech')]);

    const { result } = renderHook(() => useOgxModelsQuery('ns', 'secret'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.models).toHaveLength(0);
  });

  it('should apply modelType select filter on top of type filtering', async () => {
    mockModelsResponse([
      mockModel('llm-1', 'llm'),
      mockModel('embed-1', 'embedding'),
      mockModel('reranker-1', 'reranker'),
    ]);

    const { result } = renderHook(() => useOgxModelsQuery('ns', 'secret', 'llm'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.models).toHaveLength(1);
    expect(result.current.data?.models[0].id).toBe('llm-1');
  });

  it('should throw on invalid response structure', async () => {
    getOgxModelsMock.mockReturnValue((() => () => Promise.resolve({ invalid: 'data' })) as never);

    const { result } = renderHook(() => useOgxModelsQuery('ns', 'secret'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Invalid Open GenAI Stack models response');
  });
});

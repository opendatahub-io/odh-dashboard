import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { deleteCollection, getCollections, patchCollection } from '~/app/api/k8s';
import {
  collectionsQueryKeyPrefix,
  useCollectionsQuery,
  useDeleteCollectionMutation,
  usePatchCollectionMutation,
} from '~/app/hooks/collections';

jest.mock('~/app/api/k8s', () => ({
  deleteCollection: jest.fn(),
  getCollections: jest.fn(),
  patchCollection: jest.fn(),
}));

const mockDeleteCollection = jest.mocked(deleteCollection);
const mockGetCollections = jest.mocked(getCollections);
const mockPatchCollection = jest.mocked(patchCollection);

const createQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
};

describe('useCollectionsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches tenant collections without curated ordering', async () => {
    const getRequest = jest.fn().mockResolvedValue({ items: [] });
    mockGetCollections.mockReturnValue(getRequest);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useCollectionsQuery('test-ns', 'tenant', 25), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetCollections).toHaveBeenCalledWith('', {
      namespace: 'test-ns',
      limit: 25,
      scope: 'tenant',
      sortBy: undefined,
    });
    expect(getRequest).toHaveBeenCalledWith({ signal: expect.anything() });
  });

  it('requests curated collections in curation order', async () => {
    const getRequest = jest.fn().mockResolvedValue({ items: [] });
    mockGetCollections.mockReturnValue(getRequest);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useCollectionsQuery('test-ns', 'curated'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetCollections).toHaveBeenCalledWith('', {
      namespace: 'test-ns',
      limit: 200,
      scope: 'curated',
      sortBy: 'curation_order',
    });
  });

  it('passes curated classification filters to the collection API', async () => {
    const getRequest = jest.fn().mockResolvedValue({ items: [] });
    mockGetCollections.mockReturnValue(getRequest);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(
      () =>
        useCollectionsQuery('test-ns', 'curated', 200, undefined, {
          domains: ['agent_tools'],
          industries: ['healthcare'],
          aiEntities: ['agent'],
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetCollections).toHaveBeenCalledWith('', {
      namespace: 'test-ns',
      limit: 200,
      scope: 'curated',
      sortBy: 'curation_order',
      domains: ['agent_tools'],
      industries: ['healthcare'],
      aiEntities: ['agent'],
    });
  });
});

describe('useDeleteCollectionMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the collection and invalidates namespace collection queries', async () => {
    const deleteRequest = jest.fn().mockResolvedValue(undefined);
    mockDeleteCollection.mockReturnValue(deleteRequest);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteCollectionMutation('test-ns'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('collection-001');
    });

    expect(mockDeleteCollection).toHaveBeenCalledWith('', 'test-ns', 'collection-001');
    expect(deleteRequest).toHaveBeenCalledWith({});
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: collectionsQueryKeyPrefix('test-ns'),
    });
  });

  it('fails before calling the API when the namespace is missing', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteCollectionMutation(''), { wrapper });

    await expect(result.current.mutateAsync('collection-001')).rejects.toThrow(
      'Namespace is required to delete a collection',
    );
    expect(mockDeleteCollection).not.toHaveBeenCalled();
  });
});

describe('usePatchCollectionMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('patches the collection and invalidates namespace collection queries', async () => {
    const patchedCollection = { resource: { id: 'collection-001' }, name: 'Updated suite' };
    const patchRequest = jest.fn().mockResolvedValue(patchedCollection);
    mockPatchCollection.mockReturnValue(patchRequest);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePatchCollectionMutation('test-ns'), { wrapper });
    const operations = [{ op: 'replace' as const, path: '/name', value: 'Updated suite' }];

    await act(async () => {
      await result.current.mutateAsync({ collectionId: 'collection-001', operations });
    });

    expect(mockPatchCollection).toHaveBeenCalledWith('', 'test-ns', 'collection-001', operations);
    expect(patchRequest).toHaveBeenCalledWith({});
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: collectionsQueryKeyPrefix('test-ns'),
    });
  });

  it('fails before calling the API when the namespace is missing', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => usePatchCollectionMutation(''), { wrapper });

    await expect(
      result.current.mutateAsync({
        collectionId: 'collection-001',
        operations: [{ op: 'replace', path: '/name', value: 'Updated suite' }],
      }),
    ).rejects.toThrow('Namespace is required to patch a collection');
    expect(mockPatchCollection).not.toHaveBeenCalled();
  });
});

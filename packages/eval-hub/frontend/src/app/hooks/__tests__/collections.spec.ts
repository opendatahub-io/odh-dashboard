import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { deleteCollection, patchCollection } from '~/app/api/k8s';
import {
  collectionsQueryKeyPrefix,
  useDeleteCollectionMutation,
  usePatchCollectionMutation,
} from '~/app/hooks/collections';

jest.mock('~/app/api/k8s', () => ({
  deleteCollection: jest.fn(),
  patchCollection: jest.fn(),
}));

const mockDeleteCollection = jest.mocked(deleteCollection);
const mockPatchCollection = jest.mocked(patchCollection);

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

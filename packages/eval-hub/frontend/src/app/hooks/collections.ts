import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { deleteCollection, getCollections } from '~/app/api/k8s';
import type { CollectionScope, CollectionsListResponse } from '~/app/types';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';

export const collectionsQueryKeyPrefix = (namespace: string) =>
  ['evalhub', 'collections', namespace] as const;

export const collectionsQueryKey = (
  namespace: string,
  scope?: CollectionScope,
  limit = COLLECTION_FETCH_LIMIT,
) => [...collectionsQueryKeyPrefix(namespace), scope ?? 'all', limit] as const;

export const useCollectionsQuery = (
  namespace: string,
  scope?: CollectionScope,
  limit = COLLECTION_FETCH_LIMIT,
): UseQueryResult<CollectionsListResponse, Error> =>
  useQuery<CollectionsListResponse, Error>({
    queryKey: collectionsQueryKey(namespace, scope, limit),
    queryFn: ({ signal }) =>
      getCollections('', { namespace, limit, scope })({
        signal,
      }),
    enabled: Boolean(namespace),
  });

/**
 * Deletes a tenant-owned collection and refreshes every cached collection query
 * for the namespace, including queries with different scopes or page sizes.
 */
export const useDeleteCollectionMutation = (
  namespace: string,
): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationKey: ['evalhub', 'collections', 'delete', namespace],
    mutationFn: (collectionId) => {
      if (!namespace) {
        return Promise.reject(new Error('Namespace is required to delete a collection'));
      }
      return deleteCollection('', namespace, collectionId)({});
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeyPrefix(namespace) }),
  });
};

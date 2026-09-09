import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { deleteCollection, getCollections, patchCollection } from '~/app/api/k8s';
import type {
  CollectionPatchOperation,
  CollectionFilterParams,
  CollectionScope,
  CollectionSortBy,
  CollectionsListResponse,
  Collection,
  ListCollectionsParams,
} from '~/app/types';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';

export const collectionsQueryKeyPrefix = (namespace: string) =>
  ['evalhub', 'collections', namespace] as const;

export const collectionsQueryKey = (
  namespace: string,
  scope?: CollectionScope,
  limit = COLLECTION_FETCH_LIMIT,
  sortBy?: CollectionSortBy,
  filters?: CollectionFilterParams,
  offset?: number,
) =>
  [
    ...collectionsQueryKeyPrefix(namespace),
    scope ?? 'all',
    limit,
    offset ?? 0,
    sortBy ?? 'default',
    filters?.domains ?? [],
    filters?.industries ?? [],
    filters?.aiEntities ?? [],
  ] as const;

/**
 * Reads collections for the current tenant. The namespace identifies the
 * tenant in the BFF request; the BFF forwards it to EvalHub as X-Tenant.
 * The optional scope then narrows which collections are returned within that
 * tenant context (for example, tenant or curated collections).
 */
export const useCollectionsQuery = (
  namespace: string,
  scope?: CollectionScope,
  limit = COLLECTION_FETCH_LIMIT,
  sortBy: CollectionSortBy | undefined = scope === 'curated' ? 'curation_order' : undefined,
  filters?: CollectionFilterParams,
  offset?: number,
): UseQueryResult<CollectionsListResponse, Error> =>
  useQuery<CollectionsListResponse, Error>({
    queryKey: collectionsQueryKey(namespace, scope, limit, sortBy, filters, offset),
    queryFn: ({ signal }) => {
      const params: ListCollectionsParams = { namespace, limit, scope, sortBy, ...filters };
      if (offset != null) {
        params.offset = offset;
      }
      return getCollections('', params)({ signal });
    },
    // Keep the current page visible while a changed filter, sort, or pagination key is fetching.
    // The gallery uses isFetching to show a localized loading spinner over these results.
    placeholderData: (previousData) => previousData,
    enabled: Boolean(namespace),
  });

/**
 * Deletes a tenant-owned collection in the current tenant context. The
 * collection ID is resolved together with the namespace, so a collection from
 * another tenant cannot be targeted by changing only the ID. After deletion,
 * every cached collection query for the namespace is refreshed, including
 * queries with different scopes or page sizes.
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

export type PatchCollectionVariables = {
  collectionId: string;
  operations: CollectionPatchOperation[];
};

/**
 * Applies JSON Patch operations to a tenant-owned collection in the current
 * tenant context. The namespace is forwarded to the BFF and becomes EvalHub's
 * X-Tenant header; the collection ID identifies the resource within that
 * tenant. After the patch succeeds, every cached collection query for the
 * namespace is refreshed.
 */
export const usePatchCollectionMutation = (
  namespace: string,
): UseMutationResult<Collection, Error, PatchCollectionVariables> => {
  const queryClient = useQueryClient();

  return useMutation<Collection, Error, PatchCollectionVariables>({
    mutationKey: ['evalhub', 'collections', 'patch', namespace],
    mutationFn: ({ collectionId, operations }) => {
      if (!namespace) {
        return Promise.reject(new Error('Namespace is required to patch a collection'));
      }
      return patchCollection('', namespace, collectionId, operations)({});
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeyPrefix(namespace) }),
  });
};

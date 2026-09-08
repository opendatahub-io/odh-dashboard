import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCollections } from '~/app/api/k8s';
import type { CollectionScope, CollectionsListResponse } from '~/app/types';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';

export const collectionsQueryKey = (
  namespace: string,
  scope?: CollectionScope,
  limit = COLLECTION_FETCH_LIMIT,
) => ['evalhub', 'collections', namespace, scope ?? 'all', limit] as const;

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

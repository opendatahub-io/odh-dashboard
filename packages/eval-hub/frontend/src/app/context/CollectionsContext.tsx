import * as React from 'react';
import { useCollectionsQuery } from '~/app/hooks/collections';
import { CollectionsListResponse } from '~/app/types';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';

const INITIAL_RESPONSE: CollectionsListResponse = { items: [] };

type CollectionsContextValue = {
  response: CollectionsListResponse;
  loaded: boolean;
  loadError: Error | undefined;
  refresh: () => void;
};

export const CollectionsContext = React.createContext<CollectionsContextValue>({
  response: INITIAL_RESPONSE,
  loaded: false,
  loadError: undefined,
  refresh: () => undefined,
});

type CollectionsContextProviderProps = {
  namespace: string;
  children: React.ReactNode;
};

/**
 * Adapts the React Query collections result to the existing context contract
 * used by the collection picker and evaluation name lookup.
 *
 * Filtering and pagination are intentionally done client-side against this
 * prefetched set. React Query provides caching and request deduplication for
 * other consumers using the same namespace query.
 */
export const CollectionsContextProvider: React.FC<CollectionsContextProviderProps> = ({
  namespace,
  children,
}) => {
  const { data, isSuccess, error, refetch } = useCollectionsQuery(
    namespace,
    undefined,
    COLLECTION_FETCH_LIMIT,
  );
  const response = data ?? INITIAL_RESPONSE;
  const refresh = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  const value = React.useMemo(
    () => ({
      response,
      loaded: isSuccess || error != null,
      loadError: error ?? undefined,
      refresh,
    }),
    [response, isSuccess, error, refresh],
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
};

export const useCollectionsContext = (): CollectionsContextValue =>
  React.useContext(CollectionsContext);

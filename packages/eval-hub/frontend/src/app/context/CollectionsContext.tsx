import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCollectionsQuery } from '~/app/hooks/collections';
import { CollectionFilterParams, CollectionScope, CollectionsListResponse } from '~/app/types';
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
  const [searchParams] = useSearchParams();
  const collectionScope = searchParams.get('scope');
  const filters = React.useMemo<CollectionFilterParams | undefined>(() => {
    const domains = searchParams
      .getAll('domains')
      .flatMap((value) => value.split(','))
      .filter(Boolean);
    const industries = searchParams
      .getAll('industries')
      .flatMap((value) => value.split(','))
      .filter(Boolean);
    const aiEntities = searchParams
      .getAll('ai_entities')
      .flatMap((value) => value.split(','))
      .filter(Boolean);

    if (domains.length === 0 && industries.length === 0 && aiEntities.length === 0) {
      return undefined;
    }

    return {
      domains: domains.length > 0 ? domains : undefined,
      industries: industries.length > 0 ? industries : undefined,
      aiEntities: aiEntities.length > 0 ? aiEntities : undefined,
    };
  }, [searchParams]);
  const scope: CollectionScope | undefined =
    collectionScope === 'system' || collectionScope === 'curated' || collectionScope === 'tenant'
      ? collectionScope
      : undefined;
  const { data, isSuccess, error, refetch } = useCollectionsQuery(
    namespace,
    scope,
    COLLECTION_FETCH_LIMIT,
    undefined,
    filters,
  );
  const response = data ?? INITIAL_RESPONSE;
  const refresh = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  const value = React.useMemo(
    () => ({ response, loaded: isSuccess, loadError: error ?? undefined, refresh }),
    [response, isSuccess, error, refresh],
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
};

export const useCollectionsContext = (): CollectionsContextValue =>
  React.useContext(CollectionsContext);

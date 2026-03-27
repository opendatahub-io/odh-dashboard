import * as React from 'react';
import { useFetchState, FetchStateCallbackPromise, NotReadyError } from 'mod-arch-core';
import { getCollections } from '~/app/api/k8s';
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
 * Fetches all collections for the current namespace once and shares the result
 * with both useCollections (collection picker) and useCollectionNameMap
 * (evaluations table name lookup), eliminating duplicate network requests.
 *
 * Filtering and pagination are intentionally done client-side against this
 * prefetched set. Server-side filter params (name, category, tags, scope) are
 * available on the BFF but are not forwarded here — client-side filtering is
 * sufficient for the expected collection counts (<= COLLECTION_FETCH_LIMIT).
 * A truncation warning is surfaced to the user when the API total_count exceeds
 * the fetch limit.
 */
export const CollectionsContextProvider: React.FC<CollectionsContextProviderProps> = ({
  namespace,
  children,
}) => {
  const fetchCollections = React.useCallback<FetchStateCallbackPromise<CollectionsListResponse>>(
    (opts) => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('Namespace is required to fetch collections'));
      }
      return getCollections('', { namespace, limit: COLLECTION_FETCH_LIMIT })(opts);
    },
    [namespace],
  );

  const [response, loaded, loadError, refresh] = useFetchState<CollectionsListResponse>(
    fetchCollections,
    INITIAL_RESPONSE,
    { initialPromisePurity: true },
  );

  const value = React.useMemo(
    () => ({ response, loaded, loadError, refresh }),
    [response, loaded, loadError, refresh],
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
};

export const useCollectionsContext = (): CollectionsContextValue =>
  React.useContext(CollectionsContext);

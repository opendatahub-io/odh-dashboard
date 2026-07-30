import * as React from 'react';
import { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';

/**
 * @deprecated Use useFetch instead of useFetchState and you won't need this helper.
 * useMakeFetchObject was a helper to convert the old array-based FetchState to the new object-based FetchStateObject.
 * The new useFetch directly returns FetchStateObject, making this helper unnecessary.
 */
export const useMakeFetchObject = <T>(fetchState: FetchState<T>): FetchStateObject<T> => {
  const [data, loaded, error, refresh] = fetchState;
  return React.useMemo(() => ({ data, loaded, error, refresh }), [data, loaded, error, refresh]);
};

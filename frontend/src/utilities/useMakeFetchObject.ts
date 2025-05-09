import * as React from 'react';
import { FetchStateObject } from '~/utilities/useFetch';
import { FetchState } from '~/utilities/useFetchState';

/**
 * @deprecated Use useFetch instead of useFetchState and you won't need this helper.
 * useMakeFetchObject was a helper to convert the old array-based FetchState to the new object-based FetchStateObject.
 * The new useFetch directly returns FetchStateObject, making this helper unnecessary.
 */
export const useMakeFetchObject = <T>(fetchState: FetchState<T>): FetchStateObject<T> => {
  const [data, loaded, error, refresh] = fetchState;
  return React.useMemo(() => ({ data, loaded, error, refresh }), [data, loaded, error, refresh]);
};

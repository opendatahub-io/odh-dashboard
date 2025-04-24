import * as React from 'react';
import { ContextResourceData } from '~/types';
import { FetchState } from '~/utilities/useFetchState';
import { POLL_INTERVAL } from './const';
import { useMakeFetchObject } from './useMakeFetchObject';

/**
 * @deprecated Use useFetch with the refreshRate option instead to get the refresh behavior that was default in useContextResourceData.
 */
export const useContextResourceData = <T,>(
  resourceData: FetchState<T[]>,
  refreshInterval = POLL_INTERVAL,
): ContextResourceData<T> => {
  const [, , , refresh] = resourceData;
  React.useEffect(() => {
    const timer = setInterval(() => refresh(), refreshInterval);
    return () => clearInterval(timer);
  }, [refresh, refreshInterval]);
  return useMakeFetchObject(resourceData);
};

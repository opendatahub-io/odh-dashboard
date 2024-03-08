import * as React from 'react';
import { ContextResourceData } from '~/types';
import { FetchState } from '~/utilities/useFetchState';
import { POLL_INTERVAL } from './const';
import { useMakeFetchObject } from './useMakeFetchObject';

// TODO this should probably be removed in favor of useMakeFetchObject.
//      useFetchState already supports a refreshRate option, and useMakeFetchObject supports single values and not just arrays.
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

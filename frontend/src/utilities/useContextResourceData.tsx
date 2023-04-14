import * as React from 'react';
import { ContextResourceData } from '~/types';
import { FetchState } from '~/utilities/useFetchState';
import { POLL_INTERVAL } from './const';

export const useContextResourceData = <T,>(
  resourceData: FetchState<T[]>,
  refreshInterval = POLL_INTERVAL,
): ContextResourceData<T> => {
  const [values, loaded, error, refresh] = resourceData;
  React.useEffect(() => {
    const timer = setInterval(() => refresh(), refreshInterval);
    return () => clearInterval(timer);
  }, [refresh, refreshInterval]);
  return React.useMemo(
    () => ({
      data: values,
      loaded,
      error,
      refresh,
    }),
    [error, loaded, refresh, values],
  );
};

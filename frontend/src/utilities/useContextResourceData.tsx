import * as React from 'react';
import { ContextResourceData } from '~/types';
import { POLL_INTERVAL } from './const';

export const useContextResourceData = <T,>(
  resourceData: [data: T[], loaded: boolean, loadError: Error | undefined, refresh: () => void],
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

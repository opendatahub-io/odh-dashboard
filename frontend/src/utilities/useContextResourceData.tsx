import * as React from 'react';
import { ContextResourceData } from '../types';
import { POLL_INTERVAL } from './const';

export const useContextResourceData = <T,>(
  resourceData: [data: T[], loaded: boolean, loadError: Error | undefined, refresh: () => void],
): ContextResourceData<T> => {
  const [values, loaded, error, refresh] = resourceData;
  React.useEffect(() => {
    const timer = setInterval(() => refresh(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [refresh]);
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

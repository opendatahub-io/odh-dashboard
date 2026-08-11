import * as React from 'react';
import { HostApiContext } from '../HostApiContext';
import type { HostApiFetchStateObject } from '../types';

export const useModelServingMetrics = (
  type: string,
  queries: Record<string, string>,
  timeframe: string,
  lastUpdateTime: number,
  setLastUpdateTime: (time: number) => void,
  refreshInterval: string,
  namespace: string,
): { data: Record<string, HostApiFetchStateObject<unknown[]>>; refresh: () => void } => {
  const api = React.useContext(HostApiContext);
  return api.useModelServingMetrics(
    type,
    queries,
    timeframe,
    lastUpdateTime,
    setLastUpdateTime,
    refreshInterval,
    namespace,
  );
};

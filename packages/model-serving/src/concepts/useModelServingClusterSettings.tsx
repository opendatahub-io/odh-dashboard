import React from 'react';
import { useHostApi } from '@odh-dashboard/plugin-core/host-api';
import useFetch, { type FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';

export type ModelServingClusterSettings = {
  deploymentStrategy?: string;
  isLLMdDefault?: boolean;
};

export const useModelServingClusterSettings = (): FetchStateObject<
  ModelServingClusterSettings | null | undefined
> => {
  const { fetchDashboardConfig } = useHostApi();

  const fetchCallbackPromise = React.useCallback(async () => {
    return fetchDashboardConfig().then((config) => config.spec.modelServing ?? null);
  }, [fetchDashboardConfig]);

  return useFetch(fetchCallbackPromise, undefined);
};

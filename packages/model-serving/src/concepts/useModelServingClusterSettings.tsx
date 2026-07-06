import React from 'react';
import { fetchDashboardConfig } from '@odh-dashboard/internal/services/dashboardConfigService';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';

export type ModelServingClusterSettings = {
  deploymentStrategy?: string;
  isLLMdDefault?: boolean;
};

export const useModelServingClusterSettings = (): FetchStateObject<
  ModelServingClusterSettings | null | undefined
> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    return fetchDashboardConfig().then((config) => config.spec.modelServing ?? null);
  }, []);

  return useFetch(fetchCallbackPromise, undefined);
};

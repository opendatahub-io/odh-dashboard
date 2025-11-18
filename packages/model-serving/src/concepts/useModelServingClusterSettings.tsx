import React from 'react';
import { fetchDashboardConfig } from '@odh-dashboard/internal/services/dashboardConfigService';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';

export type ModelServingClusterSettings = {
  deploymentStrategy?: string;
  isLLMdDefault?: boolean;
};

export const useModelServingClusterSettings = (): FetchStateObject<
  ModelServingClusterSettings | undefined
> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    return fetchDashboardConfig().then((config) => config.spec.modelServing);
  }, []);

  return useFetch(fetchCallbackPromise, undefined);
};

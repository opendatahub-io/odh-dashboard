import React from 'react';
import { DashboardResource } from '@perses-dev/core';
import useFetch, { type FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { fetchPersesDashboard } from '../perses-client';

type UsePersesDashboardResult = Omit<FetchStateObject<DashboardResource | undefined>, 'data'> & {
  dashboard: DashboardResource | undefined;
};

/**
 * Hook to fetch a specific Perses dashboard by project and name from the Perses API.
 *
 * @param project - The Perses project name
 * @param dashboardName - The dashboard name within the project
 * @param persesProxyBasePath - Optional same-origin Perses proxy path
 */
export const usePersesDashboard = (
  project: string,
  dashboardName: string,
  persesProxyBasePath?: string,
): UsePersesDashboardResult => {
  const fetchDashboard = React.useCallback(
    (opts: { signal?: AbortSignal }) =>
      fetchPersesDashboard(project, dashboardName, opts.signal, persesProxyBasePath),
    [project, dashboardName, persesProxyBasePath],
  );

  const {
    data: dashboard,
    loaded,
    error,
    refresh,
  } = useFetch(fetchDashboard, undefined, {
    initialPromisePurity: true,
  });

  return { dashboard, loaded, error, refresh };
};

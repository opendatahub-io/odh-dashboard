import React from 'react';
import { DashboardResource } from '@perses-dev/core';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { fetchPersesDashboard } from '../perses-client';

type UsePersesDashboardResult = Omit<FetchStateObject<DashboardResource | undefined>, 'data'> & {
  dashboard: DashboardResource | undefined;
};

/**
 * Hook to fetch a specific Perses dashboard by project and name from the Perses API.
 *
 * @param project - The Perses project name
 * @param dashboardName - The dashboard name within the project
 */
export const usePersesDashboard = (
  project: string,
  dashboardName: string,
): UsePersesDashboardResult => {
  const fetchDashboard = React.useCallback(
    (opts: { signal?: AbortSignal }) => fetchPersesDashboard(project, dashboardName, opts.signal),
    [project, dashboardName],
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

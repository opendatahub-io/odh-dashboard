import * as React from 'react';
import { DashboardResource } from '@perses-dev/core';
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { fetchPersesDashboardsMetadata } from '../perses/perses-client';
import { filterDashboards } from '../utils/dashboardUtils';

type UsePersesDashboardsResult = Omit<FetchStateObject<DashboardResource[]>, 'data'> & {
  dashboards: DashboardResource[];
};

/**
 * Hook to fetch observability dashboards from Perses API
 */
export const usePersesDashboards = (): UsePersesDashboardsResult => {
  const { isAdmin } = useUser();

  const {
    data: allDashboards,
    loaded,
    error,
    refresh,
  } = useFetch(fetchPersesDashboardsMetadata, [], { initialPromisePurity: true });

  const dashboards = React.useMemo(
    () => filterDashboards(allDashboards, isAdmin),
    [allDashboards, isAdmin],
  );

  return { dashboards, loaded, error, refresh };
};

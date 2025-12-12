import * as React from 'react';
import { DashboardResource } from '@perses-dev/core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { fetchProjectDashboards } from '../perses/perses-client/perses-client';
import { filterDashboards } from '../utils/dashboardUtils';

type UsePersesDashboardsResult = Omit<FetchStateObject<DashboardResource[]>, 'data'> & {
  dashboards: DashboardResource[];
};

/**
 * Hook to fetch observability dashboards from Perses API
 * Fetches dashboards from /api/v1/projects/{dashboardNamespace}/dashboards
 */
export const usePersesDashboards = (): UsePersesDashboardsResult => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { isAdmin } = useUser();

  const fetchDashboards = React.useCallback(
    () => fetchProjectDashboards(dashboardNamespace),
    [dashboardNamespace],
  );

  const { data: allDashboards, loaded, error, refresh } = useFetch(fetchDashboards, []);

  const dashboards = React.useMemo(
    () => filterDashboards(allDashboards, isAdmin),
    [allDashboards, isAdmin],
  );

  return { dashboards, loaded, error, refresh };
};

import * as React from 'react';
import { DashboardResource } from '@perses-dev/core';
import useFetchDsciStatus from '@odh-dashboard/internal/concepts/areas/useFetchDsciStatus';
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { fetchProjectDashboards } from '../perses/perses-client/perses-client';
import { filterDashboards } from '../utils/dashboardUtils';

type UsePersesDashboardsResult = Omit<FetchStateObject<DashboardResource[]>, 'data'> & {
  dashboards: DashboardResource[];
};

/**
 * Hook to fetch observability dashboards from Perses API
 */
export const usePersesDashboards = (): UsePersesDashboardsResult => {
  const [dsciStatus, dsciLoaded] = useFetchDsciStatus();
  const monitoringNamespace = dsciStatus?.monitoring?.namespace;
  const { isAdmin } = useUser();

  const fetchDashboards = React.useCallback(
    () => (monitoringNamespace ? fetchProjectDashboards(monitoringNamespace) : Promise.resolve([])),
    [monitoringNamespace],
  );

  const {
    data: allDashboards,
    loaded,
    error,
    refresh,
  } = useFetch(fetchDashboards, [], { initialPromisePurity: true });

  const dashboards = React.useMemo(
    () => filterDashboards(allDashboards, isAdmin),
    [allDashboards, isAdmin],
  );

  return { dashboards, loaded: loaded && dsciLoaded, error, refresh };
};

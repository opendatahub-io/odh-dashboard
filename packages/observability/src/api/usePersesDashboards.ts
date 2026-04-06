import * as React from 'react';
import { DashboardResource } from '@perses-dev/core';
import { useAccessReview } from '@odh-dashboard/internal/api/useAccessReview';
import useFetchDsciStatus from '@odh-dashboard/internal/concepts/areas/useFetchDsciStatus';
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { fetchProjectDashboards } from '../perses/perses-client/perses-client';
import {
  filterDashboards,
  filterDashboardsByThanosNonTenancyAccess,
  THANOS_QUERIER_NON_TENANCY_ACCESS,
} from '../utils/dashboardUtils';

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
  const [canAccessThanosNonTenancy, thanosNonTenancyAccessLoaded] = useAccessReview(
    THANOS_QUERIER_NON_TENANCY_ACCESS,
  );

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

  const dashboards = React.useMemo(() => {
    const afterAdminFilter = filterDashboards(allDashboards, isAdmin);
    return filterDashboardsByThanosNonTenancyAccess(afterAdminFilter, canAccessThanosNonTenancy);
  }, [allDashboards, isAdmin, canAccessThanosNonTenancy]);

  return {
    dashboards,
    loaded: loaded && dsciLoaded && thanosNonTenancyAccessLoaded,
    error,
    refresh,
  };
};

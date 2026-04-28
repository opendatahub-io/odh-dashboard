import * as React from 'react';
import { DashboardResource } from '@perses-dev/core';
import { useAccessReview } from '@odh-dashboard/internal/api/useAccessReview';
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import {
  filterDashboards,
  filterDashboardsByThanosNonTenancyAccess,
  THANOS_QUERIER_NON_TENANCY_ACCESS,
} from '../utils/dashboardUtils';
import { fetchPersesDashboardsMetadata } from '../perses/perses-client';

type UsePersesDashboardsResult = Omit<FetchStateObject<DashboardResource[]>, 'data'> & {
  dashboards: DashboardResource[];
};

/**
 * Hook to fetch observability dashboards from Perses API
 */
export const usePersesDashboards = (): UsePersesDashboardsResult => {
  const { isAdmin } = useUser();
  const [canAccessThanosNonTenancy, thanosNonTenancyAccessLoaded] = useAccessReview(
    THANOS_QUERIER_NON_TENANCY_ACCESS,
  );

  const {
    data: allDashboards,
    loaded,
    error,
    refresh,
  } = useFetch(fetchPersesDashboardsMetadata, [], { initialPromisePurity: true });

  const dashboards = React.useMemo(() => {
    const afterAdminFilter = filterDashboards(allDashboards, isAdmin);
    return filterDashboardsByThanosNonTenancyAccess(afterAdminFilter, canAccessThanosNonTenancy);
  }, [allDashboards, isAdmin, canAccessThanosNonTenancy]);

  return {
    dashboards,
    loaded: loaded && thanosNonTenancyAccessLoaded,
    error,
    refresh,
  };
};

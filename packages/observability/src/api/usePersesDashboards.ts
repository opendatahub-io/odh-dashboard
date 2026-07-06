import * as React from 'react';
import { DashboardResource } from '@perses-dev/core';
import { useAccessReview } from '@odh-dashboard/internal/api/useAccessReview';
import type { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import useFetch, { type FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { fetchPersesDashboardsMetadata } from '../perses/perses-client';
import {
  filterDashboards,
  filterDashboardsByThanosNonTenancyAccess,
  THANOS_QUERIER_NON_TENANCY_ACCESS,
} from '../utils/dashboardUtils';

type UsePersesDashboardsOptions = {
  /**
   * When false, skips the Perses dashboard list request (e.g. DSCI already reports monitoring is not available).
   */
  fetchDashboardList?: boolean;
};

type UsePersesDashboardsResult = Omit<FetchStateObject<DashboardResource[]>, 'data'> & {
  dashboards: DashboardResource[];
};

/**
 * Hook to fetch observability dashboards from Perses API
 */
export const usePersesDashboards = (
  options?: UsePersesDashboardsOptions,
): UsePersesDashboardsResult => {
  const fetchDashboardList = options?.fetchDashboardList ?? true;
  const [canAccessThanosNonTenancy, thanosNonTenancyAccessLoaded] = useAccessReview(
    THANOS_QUERIER_NON_TENANCY_ACCESS,
  );

  const fetchDashboards = React.useCallback(
    async (opts: K8sAPIOptions) => {
      opts.signal?.throwIfAborted();
      if (!fetchDashboardList) {
        return [];
      }
      return fetchPersesDashboardsMetadata(opts.signal);
    },
    [fetchDashboardList],
  );

  const {
    data: allDashboards,
    loaded,
    error,
    refresh,
  } = useFetch(fetchDashboards, [], { initialPromisePurity: true });

  const dashboards = React.useMemo(() => {
    const afterAdminFilter = filterDashboards(allDashboards, canAccessThanosNonTenancy);
    return filterDashboardsByThanosNonTenancyAccess(afterAdminFilter, canAccessThanosNonTenancy);
  }, [allDashboards, canAccessThanosNonTenancy]);

  return {
    dashboards,
    loaded: loaded && thanosNonTenancyAccessLoaded,
    error,
    refresh,
  };
};

import * as React from 'react';
import { DashboardResource } from '@perses-dev/core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { fetchProjectDashboards } from '../perses/perses-client/perses-client';

interface UseClusterObservabilityDashboardsResult {
  dashboards: DashboardResource[];
  loaded: boolean;
  error: Error | undefined;
}

/**
 * Hook to fetch observability dashboards from Perses API
 * Fetches dashboards from /api/v1/projects/{dashboardNamespace}/dashboards
 */
export const useClusterObservabilityDashboards = (): UseClusterObservabilityDashboardsResult => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [dashboards, setDashboards] = React.useState<DashboardResource[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    let cancelled = false;

    const fetchDashboards = async () => {
      try {
        setLoaded(false);
        setError(undefined);
        const persesDashboards = await fetchProjectDashboards(dashboardNamespace);
        if (!cancelled) {
          setDashboards(persesDashboards);
          setLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoaded(true);
        }
      }
    };

    fetchDashboards();

    return () => {
      cancelled = true;
    };
  }, [dashboardNamespace]);

  return { dashboards, loaded, error };
};

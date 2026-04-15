import type { DashboardResource } from '@perses-dev/core';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/internal/k8sTypes';
import { isClusterDetailsVariable } from './variables';

export const BASE_PATH = '/observe-and-monitor/dashboard';
export const DASHBOARD_QUERY_PARAM = 'dashboard';

const PERSES_DASHBOARD_PREFIX = 'dashboard-';
const PERSES_DASHBOARD_ADMIN_SUFFIX = '-admin';

/**
 * SelfSubjectAccessReview attributes matching Thanos querier `kube-rbac-proxy-web` (port 9091) —
 * SAR on the platform Prometheus API.
 *
 * `cluster-monitoring-view` grants both `namespaces` **get** and
 * `prometheuses/api` **get|create|update** with **resourceNames: [k8s]** (`monitoring.coreos.com`).
 * The proxy secret encodes the latter; use **get** on `prometheuses/api` / `k8s` in
 * `openshift-monitoring` (not the separate `namespaces` rule).
 */
export const THANOS_QUERIER_NON_TENANCY_ACCESS: AccessReviewResourceAttributes = {
  group: 'monitoring.coreos.com',
  resource: 'prometheuses',
  subresource: 'api',
  verb: 'get',
  namespace: 'openshift-monitoring',
  name: 'k8s',
};

/**
 * Perses dashboards backed by the Thanos querier non-tenancy path (cluster-wide metrics).
 * Gated by {@link THANOS_QUERIER_NON_TENANCY_ACCESS}.
 */
export const THANOS_NON_TENANCY_GATED_DASHBOARD_NAMES: ReadonlySet<string> = new Set([
  'dashboard-0-cluster-admin',
  'dashboard-1-model',
]);

/**
 * Removes dashboards that require Thanos non-tenancy / cluster-monitoring-equivalent access
 * when the user fails the corresponding RBAC check.
 */
export const filterDashboardsByThanosNonTenancyAccess = (
  dashboards: DashboardResource[],
  canAccessThanosNonTenancy: boolean,
): DashboardResource[] => {
  if (canAccessThanosNonTenancy) {
    return dashboards;
  }
  return dashboards.filter(
    ({ metadata: { name } }) => !THANOS_NON_TENANCY_GATED_DASHBOARD_NAMES.has(name),
  );
};

/**
 * Filters and sorts dashboards according to user admin status.
 * - Only includes dashboards with names starting with PERSES_DASHBOARD_PREFIX
 * - Non-admin users are excluded from dashboards ending with PERSES_DASHBOARD_ADMIN_SUFFIX
 * - Results are sorted lexicographically by metadata.name
 * @param dashboards - List of dashboard resources
 * @param isAdminUser - Boolean flag indicating if the user is an admin
 * @returns Filtered and sorted dashboards
 */
export function filterDashboards(
  dashboards: DashboardResource[],
  isAdminUser: boolean,
): DashboardResource[] {
  return dashboards
    .filter(({ metadata: { name } }) => {
      if (!name.startsWith(PERSES_DASHBOARD_PREFIX)) {
        return false;
      }
      if (!isAdminUser && name.endsWith(PERSES_DASHBOARD_ADMIN_SUFFIX)) {
        return false;
      }
      return true;
    })
    .toSorted(({ metadata: { name: a } }, { metadata: { name: b } }) => a.localeCompare(b));
}

/**
 * Build URL for the dashboard page, preserving existing query params (like time range)
 * @param dashboardName - Selected dashboard name
 * @param currentSearch - Optional current URL search string to preserve other params
 */
export const buildDashboardUrl = (dashboardName: string, currentSearch?: string): string => {
  const params = new URLSearchParams(currentSearch);
  params.set(DASHBOARD_QUERY_PARAM, dashboardName);
  return `${BASE_PATH}?${params.toString()}`;
};

/**
 * Get display name for a dashboard, falling back to metadata name
 */
export const getDashboardDisplayName = (dashboard: DashboardResource): string =>
  dashboard.spec.display?.name || dashboard.metadata.name;

/**
 * Check if a dashboard uses any of the known cluster details variables
 */
export const hasClusterDetailsVariables = (dashboard: DashboardResource): boolean => {
  const { variables = [] } = dashboard.spec;
  return variables.some((variable) => isClusterDetailsVariable(variable.spec.name));
};

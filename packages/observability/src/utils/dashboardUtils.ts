import type { DashboardResource } from '@perses-dev/core';

export const BASE_PATH = '/observe-and-monitor/dashboard';
export const DASHBOARD_QUERY_PARAM = 'dashboard';

const PERSES_DASHBOARD_PREFIX = 'dashboard-';
const PERSES_DASHBOARD_ADMIN_SUFFIX = '-admin';

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
 * Build URL for the dashboard page
 * @param projectName - Selected project name (empty string for "All projects")
 * @param dashboardName - Selected dashboard name
 */
export const buildDashboardUrl = (projectName: string, dashboardName: string): string => {
  const path = projectName ? `${BASE_PATH}/${encodeURIComponent(projectName)}` : BASE_PATH;
  return `${path}?${DASHBOARD_QUERY_PARAM}=${encodeURIComponent(dashboardName)}`;
};

/**
 * Get display name for a dashboard, falling back to metadata name
 */
export const getDashboardDisplayName = (dashboard: DashboardResource): string =>
  dashboard.spec.display?.name || dashboard.metadata.name;

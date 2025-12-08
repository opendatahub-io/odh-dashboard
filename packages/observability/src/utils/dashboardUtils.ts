import type { DashboardResource } from '@perses-dev/core';

export const BASE_PATH = '/observe-and-monitor/dashboard';
export const DASHBOARD_QUERY_PARAM = 'dashboard';

/**
 * Build URL for the dashboard page
 * @param projectName - Selected project name (empty string for "All projects")
 * @param dashboardName - Selected dashboard name (optional, defaults to first dashboard)
 */
export const buildDashboardUrl = (projectName: string, dashboardName?: string): string => {
  const path = projectName ? `${BASE_PATH}/${encodeURIComponent(projectName)}` : BASE_PATH;
  if (dashboardName) {
    return `${path}?${DASHBOARD_QUERY_PARAM}=${encodeURIComponent(dashboardName)}`;
  }
  return path;
};

/**
 * Get display name for a dashboard, falling back to metadata name
 */
export const getDashboardDisplayName = (dashboard: DashboardResource): string =>
  dashboard.spec.display?.name || dashboard.metadata.name;

const DASHBOARD_PRIORITY_ORDER = ['cluster', 'model'];

/**
 * Sort dashboards with a fixed order for specific dashboard names.
 * - "cluster" is always first
 * - "model" is always second
 * - All other dashboards maintain their original relative order
 */
export const sortDashboardsByPriority = (dashboards: DashboardResource[]): DashboardResource[] =>
  dashboards.toSorted((a, b) => {
    const aPriority = DASHBOARD_PRIORITY_ORDER.indexOf(a.metadata.name);
    const bPriority = DASHBOARD_PRIORITY_ORDER.indexOf(b.metadata.name);

    // Both have priority - sort by priority
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }
    // Only a has priority - a comes first
    if (aPriority !== -1) {
      return -1;
    }
    // Only b has priority - b comes first
    if (bPriority !== -1) {
      return 1;
    }
    // Neither has priority - maintain original order
    return 0;
  });

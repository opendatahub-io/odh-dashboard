/**
 * Dashboard configuration data from the OdhDashboardConfig CR spec.
 * This type should match DashboardConfigKind['spec'] from the main app.
 */
export type DashboardConfigData = Record<string, unknown>;

/**
 * Internal module-level storage for dashboard configuration.
 */
let dashboardConfig: DashboardConfigData | null = null;

/**
 * Sets the dashboard configuration. Called by the main app on initialization.
 * @param config - The dashboardConfig.spec object from OdhDashboardConfig CR
 */
export const setDashboardConfig = (config: DashboardConfigData): void => {
  dashboardConfig = config;
};

/**
 * Gets the dashboard configuration for use in federated modules.
 * Returns the entire dashboardConfig.spec object, or null if not yet initialized.
 */
export const getDashboardConfig = (): DashboardConfigData | null => {
  return dashboardConfig;
};

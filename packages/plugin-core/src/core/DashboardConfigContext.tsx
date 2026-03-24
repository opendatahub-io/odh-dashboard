import * as React from 'react';

/**
 * Dashboard configuration data from the OdhDashboardConfig CR spec.
 * This type should match DashboardConfigKind['spec'] from the main app.
 */
export type DashboardConfigData = Record<string, unknown>;

/**
 * Shared React context for dashboard configuration.
 *
 * Main app provides the context:
 *   <DashboardConfigContext.Provider value={dashboardConfig.spec}>
 *
 * Federated modules consume it:
 *   const config = React.useContext(DashboardConfigContext);
 */
export const DashboardConfigContext = React.createContext<DashboardConfigData | null>(null);

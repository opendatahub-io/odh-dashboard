import * as React from 'react';

/**
 * Dashboard configuration data from the OdhDashboardConfig CR spec.
 * This type should match DashboardConfigKind['spec'] from the main app.
 */
export type DashboardConfigData = Record<string, unknown>;

/**
 * Context for providing dashboard configuration to federated modules.
 */
const DashboardConfigContext = React.createContext<DashboardConfigData | null>(null);

export const DashboardConfigProvider = DashboardConfigContext.Provider;

/**
 * Hook to access dashboard configuration from federated modules.
 * Returns the entire dashboardConfig.spec object.
 */
export const useDashboardConfig = (): DashboardConfigData => {
  const context = React.useContext(DashboardConfigContext);

  if (context === null) {
    throw new Error('useDashboardConfig must be used within a DashboardConfigProvider');
  }

  return context;
};

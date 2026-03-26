import * as React from 'react';
import type { DashboardConfigKind } from '@odh-dashboard/internal/k8sTypes';

/**
 * Shared React context for dashboard configuration.
 *
 * Main app provides the context:
 *   <DashboardConfigContext.Provider value={dashboardConfig.spec}>
 *
 * Federated modules consume it:
 *   const config = React.useContext(DashboardConfigContext);
 */
export const DashboardConfigContext = React.createContext<DashboardConfigKind['spec'] | null>(null);

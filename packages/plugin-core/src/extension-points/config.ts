import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { DashboardConfigKind } from '@odh-dashboard/internal/k8sTypes';

/**
 * Configuration data provided by the host application.
 * This is the entire dashboardConfig.spec object from the OdhDashboardConfig CR.
 */
export type DashboardConfigData = DashboardConfigKind['spec'];

/**
 * Provides dashboard configuration data to plugins.
 */
export type DashboardConfigExtension = Extension<
  'app.config/dashboard',
  {
    /** The config provider ID. */
    id: string;
    /** The configuration data (populated at runtime by DashboardConfigProvider). */
    config: Partial<DashboardConfigData>;
  }
>;

// Type guards

export const isDashboardConfigExtension = (e: Extension): e is DashboardConfigExtension =>
  e.type === 'app.config/dashboard';

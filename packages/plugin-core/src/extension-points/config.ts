import type { Extension } from '@openshift/dynamic-plugin-sdk';

/**
 * Configuration data provided by the host application.
 */
export type DashboardConfigData = {
  genAiStudioConfig?: {
    aiAssetCustomEndpoints?: {
      externalProviders?: boolean;
      clusterDomains?: string[];
    };
  };
};

/**
 * Provides dashboard configuration data to plugins.
 */
export type DashboardConfigExtension = Extension<
  'app.config/dashboard',
  {
    /** The config provider ID. */
    id: string;
    /** The configuration data. */
    config: DashboardConfigData;
  }
>;

// Type guards

export const isDashboardConfigExtension = (e: Extension): e is DashboardConfigExtension =>
  e.type === 'app.config/dashboard';

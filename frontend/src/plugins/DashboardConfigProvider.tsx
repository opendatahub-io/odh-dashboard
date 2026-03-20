import React from 'react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';
import { isDashboardConfigExtension } from '@odh-dashboard/plugin-core/extension-points';
import { useAppContext } from '#~/app/AppContext';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';

/**
 * Provider that dynamically updates the dashboard config extension
 * with the current dashboard configuration.
 * This exposes the entire dashboardConfig.spec from the OdhDashboardConfig CR.
 */
export const DashboardConfigProvider: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const pluginStore = usePluginStore();

  const configSpec = useDeepCompareMemoize(dashboardConfig.spec);

  React.useEffect(() => {
    // Find the dashboard config extension by ID
    const extensions = pluginStore.getExtensions();
    const configExtension = extensions
      .filter(isDashboardConfigExtension)
      .find((ext) => ext.properties.id === 'dashboard-config');

    if (configExtension) {
      // Update the extension with the entire spec
      configExtension.properties.config = configSpec;
    }
  }, [configSpec, pluginStore]);

  return null;
};

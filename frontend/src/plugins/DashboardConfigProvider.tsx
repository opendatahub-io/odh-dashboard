import React from 'react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';
import { isDashboardConfigExtension } from '@odh-dashboard/plugin-core/extension-points';
import { useAppContext } from '#~/app/AppContext';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';

/**
 * Provider that dynamically updates the dashboard config extension
 * with the current dashboard configuration.
 * This can be used to expose any non-feature flag data from the OdhDashboardConfig CR
 */
export const DashboardConfigProvider: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const pluginStore = usePluginStore();

  const genAiStudioConfig = useDeepCompareMemoize(dashboardConfig.spec.genAiStudioConfig);

  React.useEffect(() => {
    // Find the dashboard config extension by ID
    const extensions = pluginStore.getExtensions();
    const configExtension = extensions
      .filter(isDashboardConfigExtension)
      .find((ext) => ext.properties.id === 'genai-config');

    if (configExtension && genAiStudioConfig) {
      // Update the extension with the current config
      configExtension.properties.config = {
        genAiStudioConfig,
      };
    }
  }, [genAiStudioConfig, pluginStore]);

  return null;
};

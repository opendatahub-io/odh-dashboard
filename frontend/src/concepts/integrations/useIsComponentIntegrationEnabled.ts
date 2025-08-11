import React from 'react';
import { IntegrationAppStatus } from '#~/types';
import { IntegrationsStatusContext } from '#~/concepts/integrations/IntegrationsStatusContext';

export const isEnabled = (
  components: Record<string, IntegrationAppStatus>,
  componentName: string,
): boolean => {
  const component = componentName in components ? components[componentName] : undefined;
  return !!(component?.isEnabled && component.isInstalled);
};

export const useIsComponentIntegrationEnabled = (
  componentName: string,
): {
  isEnabled: boolean;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<boolean | undefined>;
} => {
  const { integrationStatus, loaded, error, refresh } = React.useContext(IntegrationsStatusContext);

  const refreshCallback = React.useCallback(async () => {
    const status = await refresh();
    return isEnabled(status || {}, componentName);
  }, [refresh, componentName]);

  const result = React.useMemo(
    () => ({
      isEnabled: isEnabled(integrationStatus, componentName),
      loaded,
      error,
      refresh: refreshCallback,
    }),
    [integrationStatus, componentName, loaded, error, refreshCallback],
  );

  return result;
};

import React from 'react';
import { IntegrationsContext, isEnabled } from '@odh-dashboard/plugin-core/integrations';

export const useIsComponentIntegrationEnabled = (
  componentName: string,
): {
  isEnabled: boolean;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<boolean | undefined>;
} => {
  const { integrationStatus, loaded, error, refresh } = React.useContext(IntegrationsContext);

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

import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { IntegrationsContext, isEnabled } from '@odh-dashboard/plugin-core/integrations';

export const useIsNIMAvailable = (): [
  boolean,
  boolean,
  Error | undefined,
  () => Promise<boolean | undefined>,
] => {
  const isNIMModelServingAvailable = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;
  const { integrationStatus, loaded, error, refresh } = React.useContext(IntegrationsContext);

  const refreshNIMAvailability = React.useCallback(async () => {
    const status = await refresh();
    return isEnabled(status || {}, 'nvidia-nim');
  }, [refresh]);

  const isNIMAvailable = isEnabled(integrationStatus, 'nvidia-nim') && isNIMModelServingAvailable;

  return [isNIMAvailable, loaded, error, refreshNIMAvailability];
};

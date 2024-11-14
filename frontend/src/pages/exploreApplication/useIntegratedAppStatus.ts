import * as React from 'react';
import { IntegrationAppStatus, OdhApplication } from '~/types';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { getIntegrationAppEnablementStatus } from '~/services/integrationAppService';

export const useIntegratedAppStatus = (app?: OdhApplication): FetchState<IntegrationAppStatus> => {
  const callback = React.useCallback(() => {
    if (!app) {
      return Promise.reject(new NotReadyError('Need an app to check'));
    }
    if (!app.spec.internalRoute) {
      // Silently ignore apps who don't have an internal route -- the logic is not needed
      return Promise.resolve({
        isInstalled: false,
        isEnabled: false,
        canInstall: true,
        error: '',
      });
    }

    return getIntegrationAppEnablementStatus(app.spec.internalRoute);
  }, [app]);

  return useFetchState(
    callback,
    {
      isInstalled: false,
      isEnabled: false,
      canInstall: false,
      error: '',
    },
    { initialPromisePurity: true },
  );
};

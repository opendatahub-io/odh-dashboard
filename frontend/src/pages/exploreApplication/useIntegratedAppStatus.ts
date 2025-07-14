import * as React from 'react';
import { IntegrationAppStatus, OdhApplication, VariablesValidationStatus } from '#~/types';
import useFetchState, { FetchState, NotReadyError } from '#~/utilities/useFetchState';
import { getIntegrationAppEnablementStatus } from '#~/services/integrationAppService';
import { isIntegrationApp } from '#~/utilities/utils';
import { useAppSelector } from '#~/redux/hooks';

export const useIntegratedAppStatus = (app?: OdhApplication): FetchState<IntegrationAppStatus> => {
  const forceUpdate = useAppSelector((state) => state.forceComponentsUpdate);

  const callback = React.useCallback(() => {
    if (!app) {
      return Promise.reject(new NotReadyError('Need an app to check'));
    }
    if (!isIntegrationApp(app)) {
      // Silently ignore apps who aren't an integration app -- the logic is not needed
      return Promise.resolve({
        isInstalled: false,
        isEnabled: false,
        canInstall: true,
        variablesValidationStatus: VariablesValidationStatus.UNKNOWN,
        variablesValidationTimestamp: '',
        error: '',
      });
    }

    return getIntegrationAppEnablementStatus(app.spec.internalRoute);
  }, [app, forceUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  return useFetchState(
    callback,
    {
      isInstalled: false,
      isEnabled: false,
      canInstall: false,
      variablesValidationStatus: VariablesValidationStatus.UNKNOWN,
      variablesValidationTimestamp: '',
      error: '',
    },
    {
      initialPromisePurity: true,
    },
  );
};

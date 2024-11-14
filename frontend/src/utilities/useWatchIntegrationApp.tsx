import * as React from 'react';
import { OdhApplication } from '~/types';
import { getIntegrationAppEnablementStatus } from '~/services/integrationAppService';
import { isInternalRouteIntegrationsApp } from './utils';

export const useWatchIntegrationApp = (
  app?: OdhApplication,
): {
  isIntegrationAppInstalled: boolean;
  isIntegrationAppEnabled: boolean;
  isintegrationAppChecked: boolean;
  loadError: Error | undefined;
} => {
  const [isintegrationAppChecked, setIsintegrationAppChecked] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [isIntegrationAppInstalled, setIsIntegrationAppInstalled] = React.useState(false);
  const [isIntegrationAppEnabled, setIsIntegrationAppEnabled] = React.useState(false);

  React.useEffect(() => {
    if (app?.spec.internalRoute && isInternalRouteIntegrationsApp(app.spec.internalRoute)) {
      getIntegrationAppEnablementStatus(app.spec.internalRoute)
        .then((response) => {
          setIsintegrationAppChecked(true);
          if (response.error) {
            setIsIntegrationAppInstalled(false);
            setLoadError(new Error(response.error));
          }
          if (response.isEnabled) {
            setIsIntegrationAppEnabled(true);
          }
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Error getting integration App Enablement Status', error);
          setLoadError(error);
        });
    }
  }, [app]);

  return { isIntegrationAppInstalled, isIntegrationAppEnabled, isintegrationAppChecked, loadError };
};

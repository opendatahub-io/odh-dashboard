import React from 'react';
import useFetch, { type FetchStateObject } from '#~/utilities/useFetch';
import { fetchComponents } from '#~/services/componentsServices';
import { getIntegrationAppEnablementStatus } from '#~/services/integrationAppService';
import { IntegrationAppStatus } from '#~/types';
import { isIntegrationApp } from '#~/utilities/utils';
import { useAppSelector } from '#~/redux/hooks';

export const useComponentIntegrationsStatus = (): FetchStateObject<
  Record<string, IntegrationAppStatus>
> => {
  const forceUpdate = useAppSelector((state) => state.forceComponentsUpdate);

  const fetchCallbackPromise = React.useCallback(async () => {
    const result = await fetchComponents(false);
    const integrations = result.filter((c) => c.spec.internalRoute);

    const promises = [];
    for (const app of integrations) {
      if (isIntegrationApp(app)) {
        promises.push(
          getIntegrationAppEnablementStatus(app.spec.internalRoute).then((status) => ({
            [app.metadata.name]: status,
          })),
        );
      }
    }

    const statuses = await Promise.all(promises);

    return Object.assign({}, ...statuses);
  }, [forceUpdate]);

  return useFetch(fetchCallbackPromise, {});
};

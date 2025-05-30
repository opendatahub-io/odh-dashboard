import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { getIntegrationAppEnablementStatus } from '#~/services/integrationAppService';
import { fetchComponents } from '#~/services/componentsServices';
import useFetchState from '#~/utilities/useFetchState';

export const useIsNIMAvailable = (): [
  boolean,
  boolean,
  Error | undefined,
  () => Promise<boolean | undefined>,
] => {
  const isNIMModelServingAvailable = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;

  const fetchNIMAvailability = React.useCallback(async () => {
    if (!isNIMModelServingAvailable) {
      return false;
    }
    const components = await fetchComponents(false);
    const nimComponent = components.find((component) => component.metadata.name === 'nvidia-nim');

    if (!nimComponent || !nimComponent.spec.internalRoute) {
      return false;
    }

    const { isInstalled, isEnabled } = await getIntegrationAppEnablementStatus(
      nimComponent.spec.internalRoute,
    );

    return isInstalled && isEnabled;
  }, [isNIMModelServingAvailable]);

  const [isNIMAvailable, loaded, loadError, refresh] = useFetchState<boolean>(
    fetchNIMAvailability,
    false,
    {
      initialPromisePurity: false,
    },
  );

  return [isNIMAvailable, loaded, loadError, refresh];
};

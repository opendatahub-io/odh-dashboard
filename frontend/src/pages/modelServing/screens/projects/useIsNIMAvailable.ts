import { SupportedArea } from '#~/concepts/areas/types';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { useIsComponentIntegrationEnabled } from '#~/concepts/integrations/useIsComponentIntegrationEnabled';

export const useIsNIMAvailable = (): [
  boolean,
  boolean,
  Error | undefined,
  () => Promise<boolean | undefined>,
] => {
  const isNIMModelServingAvailable = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;

  const {
    isEnabled: isNIMAvailable,
    loaded,
    error,
    refresh: refreshNIMAvailability,
  } = useIsComponentIntegrationEnabled('nvidia-nim');

  return [isNIMAvailable && isNIMModelServingAvailable, loaded, error, refreshNIMAvailability];
};

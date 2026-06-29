import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
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

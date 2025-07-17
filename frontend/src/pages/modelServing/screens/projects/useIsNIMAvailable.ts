import { SupportedArea } from '#~/concepts/areas/types';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { useIsComponentEnabled } from '#~/concepts/integrations/useIsComponentEnabled';

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
  } = useIsComponentEnabled('nvidia-nim');

  return [isNIMAvailable && isNIMModelServingAvailable, loaded, error, refreshNIMAvailability];
};

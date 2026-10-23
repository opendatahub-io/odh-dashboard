import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

export const useIsDRAHardwareProfileEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.HARDWARE_PROFILE_DRA).status;

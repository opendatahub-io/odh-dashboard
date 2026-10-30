import React from 'react';
import type { StatusProviderHook } from '@odh-dashboard/plugin-core/extension-points';
import { useWatchHardwareProfiles } from '@odh-dashboard/internal/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors';
import {
  generateWarningForHardwareProfiles,
  HardwareProfileBannerWarningTitles,
} from './pages/utils';
import { useIsDRAHardwareProfileEnabled } from '../shared/useIsDRAHardwareProfileEnabled';
import { filterHardwareProfilesByDRAAvailability } from '../shared/utils';

export const useHardwareProfilesStatusProvider: StatusProviderHook = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [allHardwareProfiles] = useWatchHardwareProfiles(dashboardNamespace);
  const isDRAEnabled = useIsDRAHardwareProfileEnabled();
  const hardwareProfiles = React.useMemo(
    () => filterHardwareProfilesByDRAAvailability(allHardwareProfiles, isDRAEnabled),
    [allHardwareProfiles, isDRAEnabled],
  );

  const warning = generateWarningForHardwareProfiles(hardwareProfiles, isDRAEnabled);
  const warningMessage =
    warning?.title === HardwareProfileBannerWarningTitles.ALL_INVALID ? warning.title : undefined;

  return React.useMemo(
    () => (warningMessage ? { status: 'warning', message: warningMessage } : undefined),
    [warningMessage],
  );
};

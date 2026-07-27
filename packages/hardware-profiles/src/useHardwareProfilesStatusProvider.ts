import React from 'react';
import type { StatusProviderHook } from '@odh-dashboard/plugin-core/extension-points';
import { useWatchHardwareProfiles } from '@odh-dashboard/internal/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors';
import {
  generateWarningForHardwareProfiles,
  HardwareProfileBannerWarningTitles,
} from './pages/utils';

export const useHardwareProfilesStatusProvider: StatusProviderHook = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [hardwareProfiles] = useWatchHardwareProfiles(dashboardNamespace);

  const warning = generateWarningForHardwareProfiles(hardwareProfiles);
  const warningMessage =
    warning?.title === HardwareProfileBannerWarningTitles.ALL_INVALID ? warning.title : undefined;

  return React.useMemo(
    () => (warningMessage ? { status: 'warning', message: warningMessage } : undefined),
    [warningMessage],
  );
};

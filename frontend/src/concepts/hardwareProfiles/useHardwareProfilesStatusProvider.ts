import React from 'react';
import type { StatusProviderHook } from '@odh-dashboard/plugin-core/extension-points';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import {
  generateWarningForHardwareProfiles,
  HardwareProfileBannerWarningTitles,
} from '#~/pages/hardwareProfiles/utils';
import { useDashboardNamespace } from '#~/redux/selectors';

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

import React from 'react';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { isHardwareProfileValid } from '#~/pages/hardwareProfiles/utils';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';

export const useHardwareProfilesByFeatureVisibility = (
  visibility?: HardwareProfileFeatureVisibility[],
  namespace?: string,
): [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined] => {
  const { dashboardNamespace } = useDashboardNamespace();

  const [hardwareProfiles, loadedHardwareProfiles, loadErrorHardwareProfiles] =
    useWatchHardwareProfiles(namespace ?? dashboardNamespace);

  // only show valid profiles
  const validHardwareProfiles = React.useMemo(
    () => hardwareProfiles.filter((profile) => isHardwareProfileValid(profile)),
    [hardwareProfiles],
  );

  const filteredHardwareProfiles = React.useMemo(
    () =>
      validHardwareProfiles.filter((profile) => {
        try {
          if (!profile.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility']) {
            return true;
          }

          const visibleIn = JSON.parse(
            profile.metadata.annotations['opendatahub.io/dashboard-feature-visibility'],
          );

          if (visibleIn.length === 0) {
            return true;
          }

          return visibility ? visibility.some((a) => visibleIn.includes(a)) : true;
        } catch (error) {
          return true;
        }
      }),
    [validHardwareProfiles, visibility],
  );

  return [filteredHardwareProfiles, loadedHardwareProfiles, loadErrorHardwareProfiles];
};

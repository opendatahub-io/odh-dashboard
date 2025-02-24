import React from 'react';
import { HardwareProfileKind, HardwareProfileVisibleIn } from '~/k8sTypes';
import { isHardwareProfileValid } from '~/pages/hardwareProfiles/utils';
import useMigratedHardwareProfiles from './useMigratedHardwareProfiles';

export const useHardwareProfilesByArea = (
  areas?: HardwareProfileVisibleIn[],
): [
  data: HardwareProfileKind[],
  loaded: boolean,
  loadError: Error | undefined,
  refresh: () => Promise<void>,
] => {
  const { data: hardwareProfiles, loaded, loadError, refresh } = useMigratedHardwareProfiles();

  // only show valid profiles
  const validHardwareProfiles = React.useMemo(
    () => hardwareProfiles.filter((profile) => isHardwareProfileValid(profile)),
    [hardwareProfiles],
  );

  const filteredHardwareProfiles = React.useMemo(
    () =>
      validHardwareProfiles.filter((profile) => {
        try {
          if (!profile.metadata.annotations?.['opendatahub.io/visible-in']) {
            return true;
          }

          const visibleIn = JSON.parse(profile.metadata.annotations['opendatahub.io/visible-in']);
          return areas ? areas.some((a) => visibleIn.includes(a)) : true;
        } catch (error) {
          return true;
        }
      }),
    [validHardwareProfiles, areas],
  );

  return [filteredHardwareProfiles, loaded, loadError, refresh];
};

import React from 'react';
import { HardwareProfileKind, HardwareProfileVisibleIn } from '~/k8sTypes';
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

  const filteredHardwareProfiles = React.useMemo(
    () =>
      hardwareProfiles.filter((profile) => {
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
    [hardwareProfiles, areas],
  );

  return [filteredHardwareProfiles, loaded, loadError, refresh];
};

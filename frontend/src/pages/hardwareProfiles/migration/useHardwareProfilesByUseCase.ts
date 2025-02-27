import React from 'react';
import { HardwareProfileKind, HardwareProfileUseCases } from '~/k8sTypes';
import { isHardwareProfileValid } from '~/pages/hardwareProfiles/utils';
import useMigratedHardwareProfiles from './useMigratedHardwareProfiles';

export const useHardwareProfilesByUseCase = (
  useCases?: HardwareProfileUseCases[],
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
          if (!profile.metadata.annotations?.['opendatahub.io/use-cases']) {
            return true;
          }

          const visibleIn = JSON.parse(profile.metadata.annotations['opendatahub.io/use-cases']);
          return useCases ? useCases.some((a) => visibleIn.includes(a)) : true;
        } catch (error) {
          return true;
        }
      }),
    [validHardwareProfiles, useCases],
  );

  return [filteredHardwareProfiles, loaded, loadError, refresh];
};

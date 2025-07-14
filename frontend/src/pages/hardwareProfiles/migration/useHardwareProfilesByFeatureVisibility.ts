import React from 'react';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { isHardwareProfileValid } from '#~/pages/hardwareProfiles/utils';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';
import useMigratedHardwareProfiles from './useMigratedHardwareProfiles';

export const useHardwareProfilesByFeatureVisibility = (
  visibility?: HardwareProfileFeatureVisibility[],
  namespace?: string,
): [
  data: HardwareProfileKind[],
  loaded: boolean,
  loadError: Error | undefined,
  refresh: () => Promise<void>,
] => {
  const { dashboardNamespace } = useDashboardNamespace();

  const {
    data: migratedHardwareProfiles,
    loaded: loadedMigratedHardwareProfiles,
    loadError: loadErrorMigratedHardwareProfiles,
    refresh,
  } = useMigratedHardwareProfiles(namespace ?? dashboardNamespace);

  const [hardwareProfiles, loadedHardwareProfiles, loadErrorHardwareProfiles] =
    useWatchHardwareProfiles(namespace ?? dashboardNamespace);

  const loaded = loadedMigratedHardwareProfiles && loadedHardwareProfiles;
  const loadError = loadErrorMigratedHardwareProfiles || loadErrorHardwareProfiles;

  const allHardwareProfiles = React.useMemo(
    () => [...migratedHardwareProfiles, ...hardwareProfiles],
    [migratedHardwareProfiles, hardwareProfiles],
  );

  // only show valid profiles
  const validHardwareProfiles = React.useMemo(
    () => allHardwareProfiles.filter((profile) => isHardwareProfileValid(profile)),
    [allHardwareProfiles],
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

  return [filteredHardwareProfiles, loaded, loadError, refresh];
};

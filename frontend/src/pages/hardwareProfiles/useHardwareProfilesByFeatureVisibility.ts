import React from 'react';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { isHardwareProfileValid } from '#~/pages/hardwareProfiles/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { HardwareProfilesContext } from '#~/concepts/hardwareProfiles/HardwareProfilesContext';

export const useHardwareProfilesByFeatureVisibility = (
  visibility?: HardwareProfileFeatureVisibility[],
  namespace?: string,
): {
  projectProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
  globalProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
} => {
  const {
    globalHardwareProfiles: [globalProfiles, globalProfilesLoaded, globalProfilesError],
    projectHardwareProfiles: [allProjectProfiles, projectProfilesLoaded, projectProfilesError],
  } = React.useContext(HardwareProfilesContext);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const currNamespace = namespace || currentProject.metadata.name;

  const projectProfilesFiltered = React.useMemo(() => {
    const projectProfiles = currNamespace
      ? allProjectProfiles.filter((hp) => hp.metadata.namespace === currNamespace)
      : [];
    return filterHardwareProfileByFeatureVisibility(projectProfiles, visibility);
  }, [allProjectProfiles, currNamespace, visibility]);

  const globalProfilesFiltered = React.useMemo(
    () => filterHardwareProfileByFeatureVisibility(globalProfiles, visibility),
    [globalProfiles, visibility],
  );

  return {
    projectProfiles: [
      projectProfilesFiltered,
      currNamespace ? projectProfilesLoaded : true,
      projectProfilesError,
    ],
    globalProfiles: [globalProfilesFiltered, globalProfilesLoaded, globalProfilesError],
  };
};

export const filterHardwareProfileByFeatureVisibility = (
  hardwareProfiles: HardwareProfileKind[],
  visibility?: HardwareProfileFeatureVisibility[],
): HardwareProfileKind[] => {
  // only show valid profiles
  const validHardwareProfiles = hardwareProfiles.filter((profile) =>
    isHardwareProfileValid(profile),
  );

  const filteredHardwareProfiles = validHardwareProfiles.filter((profile) => {
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
  });

  return filteredHardwareProfiles;
};

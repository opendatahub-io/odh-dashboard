import React from 'react';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { isHardwareProfileValid } from '#~/pages/hardwareProfiles/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { HardwareProfilesContext } from '#~/concepts/hardwareProfiles/HardwareProfilesContext';

export const useHardwareProfilesByFeatureVisibility = (
  visibility?: HardwareProfileFeatureVisibility[],
): {
  projectProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
  globalProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
} => {
  const {
    globalHardwareProfiles: [globalProfiles, globalLoaded, globalError],
  } = React.useContext(HardwareProfilesContext);
  const {
    currentProject,
    projectHardwareProfiles: [projectProfiles, projectLoaded, projectError],
  } = React.useContext(ProjectDetailsContext);

  const projectProfilesFiltered = React.useMemo(
    () => filterHardwareProfileByFeatureVisibility(projectProfiles, visibility),
    [projectProfiles, visibility],
  );
  const globalProfilesFiltered = React.useMemo(
    () => filterHardwareProfileByFeatureVisibility(globalProfiles, visibility),
    [globalProfiles, visibility],
  );
  const inProject = !!currentProject.metadata.name;
  return {
    projectProfiles: [projectProfilesFiltered, inProject ? projectLoaded : true, projectError],
    globalProfiles: [globalProfilesFiltered, globalLoaded, globalError],
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

import React from 'react';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { isHardwareProfileValid } from '#~/pages/hardwareProfiles/utils';
import { HardwareProfilesContext } from '#~/concepts/hardwareProfiles/HardwareProfilesContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext.tsx';
import { CustomWatchK8sResult } from '#~/types.ts';

export const useHardwareProfilesByFeatureVisibility = (
  visibility?: HardwareProfileFeatureVisibility[],
  projectHardwareProfiles?: CustomWatchK8sResult<HardwareProfileKind[]>,
): {
  projectProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
  globalProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
} => {
  const {
    globalHardwareProfiles: [globalProfiles, globalProfilesLoaded, globalProfilesError],
  } = React.useContext(HardwareProfilesContext);
  const {
    currentProject,
    projectHardwareProfiles: [
      projectProfilesFromContext,
      projectProfilesFromContextLoaded,
      projectProfilesFromContextError,
    ],
  } = React.useContext(ProjectDetailsContext);

  const [givenProjectProfiles, givenProjectProfilesLoaded, givenProjectProfilesError] =
    projectHardwareProfiles || [];
  const projectProfiles = givenProjectProfiles || projectProfilesFromContext;
  const projectProfilesLoaded =
    givenProjectProfilesLoaded ||
    (currentProject.metadata.name ? projectProfilesFromContextLoaded : true);
  const projectProfilesError = givenProjectProfilesError || projectProfilesFromContextError;

  const projectProfilesFiltered = React.useMemo(
    () => filterHardwareProfileByFeatureVisibility(projectProfiles, visibility),
    [projectProfiles, visibility],
  );
  const globalProfilesFiltered = React.useMemo(
    () => filterHardwareProfileByFeatureVisibility(globalProfiles, visibility),
    [globalProfiles, visibility],
  );
  return {
    projectProfiles: [projectProfilesFiltered, projectProfilesLoaded, projectProfilesError],
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

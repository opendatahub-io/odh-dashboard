import React from 'react';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { isHardwareProfileValid } from '#~/pages/hardwareProfiles/utils';
import { HardwareProfilesContext } from '#~/concepts/hardwareProfiles/HardwareProfilesContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';

/**
 * Hook to get hardware profiles filtered by feature visibility.
 *
 * Simple logic:
 * 1. Global profiles - always from HardwareProfilesContext (dashboard namespace)
 * 2. Project profiles:
 *    - If in ProjectDetailsContext and namespace matches (or no namespace) → use context
 *    - Otherwise, fetch for the specific namespace
 *
 * Note: This may create duplicate watches in some cases (e.g., global deployments table),
 * but that's acceptable as React hooks will be memoized per component instance and
 * the complexity of trying to avoid it is not worth the maintenance burden.
 *
 * @param visibility - Feature visibility filter
 * @param namespace - Optional namespace for project-scoped profiles
 */
export const useHardwareProfilesByFeatureVisibility = (
  visibility?: HardwareProfileFeatureVisibility[],
  namespace?: string,
): {
  projectProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
  globalProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
} => {
  const { dashboardNamespace } = useDashboardNamespace();

  // Always get global profiles from HardwareProfilesContext
  const {
    globalHardwareProfiles: [globalProfiles, globalProfilesLoaded, globalProfilesError],
  } = React.useContext(HardwareProfilesContext);

  // Try to get project profiles from ProjectDetailsContext
  const { currentProject, projectHardwareProfiles: contextProjectProfiles } =
    React.useContext(ProjectDetailsContext);

  // Determine if we should use context project profiles or fetch them
  const shouldUseContextProfiles =
    !!currentProject.metadata.name && (!namespace || currentProject.metadata.name === namespace);
  const shouldFetchProfiles =
    namespace && namespace !== dashboardNamespace && !shouldUseContextProfiles;

  // Only watch if we actually need to fetch (pass undefined to disable the watch)
  const namespaceToWatch = shouldFetchProfiles ? namespace : undefined;
  const [fetchedProfiles, fetchedProfilesLoaded, fetchedProfilesError] =
    useWatchHardwareProfiles(namespaceToWatch);

  // Determine which project profiles to use with stable references
  // Destructure the tuple to get stable references to the individual elements
  const projectProfilesResult = React.useMemo<
    [HardwareProfileKind[], boolean, Error | undefined]
  >(() => {
    if (shouldUseContextProfiles) {
      return contextProjectProfiles;
    }
    if (shouldFetchProfiles) {
      return [fetchedProfiles, fetchedProfilesLoaded, fetchedProfilesError];
    }
    // Stable empty result
    return [[], true, undefined];
  }, [
    shouldUseContextProfiles,
    shouldFetchProfiles,
    contextProjectProfiles,
    fetchedProfiles,
    fetchedProfilesLoaded,
    fetchedProfilesError,
  ]);

  const [projectProfiles, projectProfilesLoaded, projectProfilesError] = projectProfilesResult;

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

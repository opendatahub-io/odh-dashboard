import React from 'react';
import {
  type HardwareProfileKind,
  HardwareProfileFeatureVisibility,
} from '@odh-dashboard/k8s-core';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core';
import {
  HardwareProfilesContext,
  useWatchHardwareProfiles,
} from '@odh-dashboard/ui-core/context/HardwareProfilesContext';
import { CurrentProjectContext } from '@odh-dashboard/ui-core/context/CurrentProjectContext';
import { ProjectHardwareProfilesContext } from '@odh-dashboard/ui-core/context/ProjectHardwareProfilesContext';
import { isHardwareProfileValid, isHardwareProfileVisibleIn } from './utils';
import { isDRAHardwareProfile } from '../../shared/utils';

export type DRAProfileFilter = 'none' | 'valid' | 'all';

/**
 * Hook to get hardware profiles filtered by feature visibility.
 *
 * Simple logic:
 * 1. Global profiles - always from HardwareProfilesContext (dashboard namespace)
 * 2. Project profiles:
 *    - If in ProjectHardwareProfilesContext and namespace matches (or no namespace) → use context
 *    - Otherwise, fetch for the specific namespace
 *
 * Note: This may create duplicate watches in some cases (e.g., global deployments table),
 * but that's acceptable as React hooks will be memoized per component instance and
 * the complexity of trying to avoid it is not worth the maintenance burden.
 *
 * @param visibility - Feature visibility filter
 * @param namespace - Optional namespace for project-scoped profiles
 * @param options - `dra` controls profiles that use dynamic resource allocation: `'none'` (default)
 * excludes them, `'valid'` keeps them under the same validity rules as other profiles, and `'all'`
 * keeps every one, including ones without identifiers, for resolving an already-assigned profile.
 */
export const useHardwareProfilesByFeatureVisibility = (
  visibility?: HardwareProfileFeatureVisibility[],
  namespace?: string,
  options?: { dra?: DRAProfileFilter },
): {
  projectProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
  globalProfiles: [data: HardwareProfileKind[], loaded: boolean, loadError: Error | undefined];
} => {
  const { dashboardNamespace } = useDashboardNamespace();

  // Always get global profiles from HardwareProfilesContext
  const {
    globalHardwareProfiles: [globalProfiles, globalProfilesLoaded, globalProfilesError],
  } = React.useContext(HardwareProfilesContext);

  const { currentProject } = React.useContext(CurrentProjectContext);
  const { projectHardwareProfiles: contextProjectProfiles } = React.useContext(
    ProjectHardwareProfilesContext,
  );

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

  const dra = options?.dra ?? 'none';
  const projectProfilesFiltered = React.useMemo(
    () => filterHardwareProfileByFeatureVisibility(projectProfiles, visibility, dra),
    [projectProfiles, visibility, dra],
  );
  const globalProfilesFiltered = React.useMemo(
    () => filterHardwareProfileByFeatureVisibility(globalProfiles, visibility, dra),
    [globalProfiles, visibility, dra],
  );
  return {
    projectProfiles: [projectProfilesFiltered, projectProfilesLoaded, projectProfilesError],
    globalProfiles: [globalProfilesFiltered, globalProfilesLoaded, globalProfilesError],
  };
};

export const filterHardwareProfileByFeatureVisibility = (
  hardwareProfiles: HardwareProfileKind[],
  visibility?: HardwareProfileFeatureVisibility[],
  dra: DRAProfileFilter = 'none',
): HardwareProfileKind[] => {
  const validHardwareProfiles = hardwareProfiles.filter((profile) => {
    if (!isDRAHardwareProfile(profile)) {
      return isHardwareProfileValid(profile);
    }
    return dra === 'all' || (dra === 'valid' && isHardwareProfileValid(profile));
  });

  const filteredHardwareProfiles = validHardwareProfiles.filter((profile) =>
    isHardwareProfileVisibleIn(profile, visibility),
  );

  return filteredHardwareProfiles;
};

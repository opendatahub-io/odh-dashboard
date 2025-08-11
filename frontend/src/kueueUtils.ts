import * as React from 'react';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import { KnownLabels, ProjectKind, HardwareProfileKind } from '#~/k8sTypes';
import { SchedulingType } from '#~/types';

/**
 * Custom hook to manage Kueue configuration state and determine various Kueue-related behaviors.
 *
 * Returns:
 * - isKueueDisabled: true when project has Kueue enabled but feature flag is disabled
 * - isKueueFeatureEnabled: whether Kueue feature flag is enabled globally
 * - isProjectKueueEnabled: whether the project has Kueue enabled
 * - kueueFilteringState: enum indicating which hardware profiles should be shown
 */
export enum KueueFilteringState {
  ONLY_KUEUE_PROFILES = 'only-kueue',
  ONLY_NON_KUEUE_PROFILES = 'only-non-kueue',
  NO_PROFILES = 'no-profiles',
}

export const useKueueConfiguration = (
  project: ProjectKind | undefined,
): {
  isKueueDisabled: boolean;
  isKueueFeatureEnabled: boolean;
  isProjectKueueEnabled: boolean;
  kueueFilteringState: KueueFilteringState;
} => {
  const isKueueFeatureEnabled = useIsAreaAvailable(SupportedArea.KUEUE).status;

  const isProjectKueueEnabled = React.useMemo(
    () => project?.metadata.labels?.[KnownLabels.KUEUE_MANAGED] === 'true',
    [project?.metadata.labels],
  );

  const isKueueDisabled = React.useMemo(
    () => isProjectKueueEnabled && !isKueueFeatureEnabled,
    [isProjectKueueEnabled, isKueueFeatureEnabled],
  );

  const kueueFilteringState = React.useMemo(() => {
    // Case 1: Kueue globally enabled + Project is Kueue-enabled → Only Kueue profiles
    if (isKueueFeatureEnabled && isProjectKueueEnabled) {
      return KueueFilteringState.ONLY_KUEUE_PROFILES;
    }

    // Case 4: Kueue globally disabled + Project is Kueue-enabled → No profiles
    if (!isKueueFeatureEnabled && isProjectKueueEnabled) {
      return KueueFilteringState.NO_PROFILES;
    }

    // Case 2 & 3: All other cases → Only non-Kueue profiles
    return KueueFilteringState.ONLY_NON_KUEUE_PROFILES;
  }, [isKueueFeatureEnabled, isProjectKueueEnabled]);

  return {
    isKueueDisabled,
    isKueueFeatureEnabled,
    isProjectKueueEnabled,
    kueueFilteringState,
  };
};

export const filterProfilesByKueue = (
  profiles: HardwareProfileKind[],
  kueueFilteringState: KueueFilteringState,
): HardwareProfileKind[] => {
  if (kueueFilteringState === KueueFilteringState.NO_PROFILES) {
    return [];
  }

  return profiles.filter((profile) => {
    const isKueueProfile = profile.spec.scheduling?.type === SchedulingType.QUEUE;
    switch (kueueFilteringState) {
      case KueueFilteringState.ONLY_KUEUE_PROFILES:
        return isKueueProfile;
      case KueueFilteringState.ONLY_NON_KUEUE_PROFILES:
        return !isKueueProfile;
      default:
        return true;
    }
  });
};

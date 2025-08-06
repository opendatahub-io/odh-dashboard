import * as React from 'react';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import { KnownLabels } from '#~/k8sTypes';
import { ProjectKind } from '#~/k8sTypes';

/**
 * Custom hook to determine if create actions should be disabled due to Kueue configuration.
 *
 * Returns true when:
 * - Project has Kueue enabled (kueue.openshift.io/managed: 'true' label)
 * - But Kueue feature flag is disabled in the cluster
 *
 * This indicates the project expects Kueue functionality but it's not available,
 * so create actions for workbenches and model deployments should be disabled.
 */
export const useKueueDisabled = (
  project: ProjectKind,
): {
  isKueueDisabled: boolean;
  shouldShowKueueAlert: boolean;
} => {
  const isKueueFeatureEnabled = useIsAreaAvailable(SupportedArea.KUEUE).status;

  const isProjectKueueEnabled = React.useMemo(
    () => project.metadata.labels?.[KnownLabels.KUEUE_MANAGED] === 'true',
    [project.metadata.labels],
  );

  const isKueueDisabled = React.useMemo(
    () => isProjectKueueEnabled && !isKueueFeatureEnabled,
    [isProjectKueueEnabled, isKueueFeatureEnabled],
  );

  return {
    isKueueDisabled,
    shouldShowKueueAlert: isKueueDisabled, // Same logic for now, but can be extended
  };
};

export default useKueueDisabled;

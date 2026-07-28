import React from 'react';
import { HardwareProfileFeatureVisibility } from '@odh-dashboard/k8s-core';
import type { NotebookKind } from '@odh-dashboard/k8s-core';
import { isHardwareProfileEnabled } from '@odh-dashboard/internal/pages/hardwareProfiles/utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors';
import { useHardwareProfilesByFeatureVisibility } from '@odh-dashboard/internal/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { HardwareProfileBindingStateInfo } from './types';
import type { HardwareProfileResource } from './types';
import { HardwareProfileBindingState } from './const';

/**
 * Hook to get hardware profile binding state for a resource.
 *
 * @param resource - Notebook or Model resource
 * @param visibility - Feature visibility filter
 */
export const useHardwareProfileBindingState = (
  resource?: NotebookKind | HardwareProfileResource,
  visibility?: HardwareProfileFeatureVisibility[],
): [HardwareProfileBindingStateInfo | null, boolean, Error | undefined] => {
  const { dashboardNamespace } = useDashboardNamespace();
  const hardwareProfileName =
    resource?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const hardwareProfileNamespace =
    resource?.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'] ||
    dashboardNamespace;
  const resourceVersion =
    resource?.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version'];

  const {
    globalProfiles: [globalProfilesList, globalProfilesLoaded, globalProfilesError],
    projectProfiles: [projectProfilesList, projectProfilesLoaded, projectProfilesError],
  } = useHardwareProfilesByFeatureVisibility(visibility, hardwareProfileNamespace);

  const profile = React.useMemo(() => {
    return [...globalProfilesList, ...projectProfilesList].find(
      (p) =>
        p.metadata.name === hardwareProfileName &&
        p.metadata.namespace === hardwareProfileNamespace,
    );
  }, [globalProfilesList, projectProfilesList, hardwareProfileName, hardwareProfileNamespace]);

  const loaded = globalProfilesLoaded && projectProfilesLoaded;
  const loadError = globalProfilesError || projectProfilesError;

  if (!hardwareProfileName && resourceVersion) {
    // hardware profile was assigned at some point due to presence of
    // resource version annotation, but has since been deleted
    return [
      {
        state: HardwareProfileBindingState.DELETED,
        profile: undefined,
      },
      true,
      undefined,
    ];
  }

  if (!hardwareProfileName || !hardwareProfileNamespace) {
    return [null, true, undefined];
  }

  if (!loaded) {
    return [null, false, loadError];
  }

  if (loadError) {
    return [null, loaded, loadError];
  }

  if (!profile) {
    return [
      {
        state: HardwareProfileBindingState.DELETED,
        profile: undefined,
      },
      true,
      undefined,
    ];
  }

  const isDisabled = !isHardwareProfileEnabled(profile);
  const storedResourceVersion =
    resource.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version'];
  const isUpdated =
    storedResourceVersion && profile.metadata.resourceVersion
      ? storedResourceVersion !== profile.metadata.resourceVersion
      : false;

  let state: HardwareProfileBindingState | undefined;
  if (isDisabled) {
    state = HardwareProfileBindingState.DISABLED;
  } else if (isUpdated) {
    state = HardwareProfileBindingState.UPDATED;
  }

  return [
    {
      state,
      profile,
    },
    loaded,
    loadError,
  ];
};

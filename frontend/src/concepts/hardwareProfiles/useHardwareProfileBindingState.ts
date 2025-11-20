// eslint-disable-next-line import/no-extraneous-dependencies
import { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import React from 'react';
import { HardwareProfileFeatureVisibility, HardwareProfileKind, NotebookKind } from '#~/k8sTypes';
import { isHardwareProfileEnabled } from '#~/pages/hardwareProfiles/utils';
import { useDashboardNamespace } from '#~/redux/selectors';
import { HardwareProfileBindingStateInfo } from '#~/concepts/hardwareProfiles/types';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { CustomWatchK8sResult } from '#~/types.ts';
import { HardwareProfileBindingState } from './const';

export const useHardwareProfileBindingState = (
  resource?: NotebookKind | ModelResourceType,
  visibility?: HardwareProfileFeatureVisibility[],
  extraProfiles?: CustomWatchK8sResult<HardwareProfileKind[]>,
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
  } = useHardwareProfilesByFeatureVisibility(visibility, extraProfiles);

  const extraProfilesList = extraProfiles?.[0];
  const extraProfilesLoaded = extraProfiles?.[1];
  const extraProfilesLoadError = extraProfiles?.[2];

  const profile = React.useMemo(() => {
    if (extraProfilesList && extraProfilesList.length > 0) {
      const extraProfile = extraProfilesList.find(
        (p) =>
          p.metadata.name === hardwareProfileName &&
          p.metadata.namespace === hardwareProfileNamespace,
      );
      if (extraProfile) {
        return extraProfile;
      }
    }

    return [...globalProfilesList, ...projectProfilesList].find(
      (p) =>
        p.metadata.name === hardwareProfileName &&
        p.metadata.namespace === hardwareProfileNamespace,
    );
  }, [
    extraProfilesList,
    globalProfilesList,
    projectProfilesList,
    hardwareProfileName,
    hardwareProfileNamespace,
  ]);

  const loaded =
    globalProfilesLoaded && projectProfilesLoaded && (extraProfiles ? extraProfilesLoaded : true);
  const loadError =
    globalProfilesError ||
    projectProfilesError ||
    (extraProfiles ? extraProfilesLoadError : undefined);

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

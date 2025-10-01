// eslint-disable-next-line import/no-extraneous-dependencies
import { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import { NotebookKind } from '#~/k8sTypes';
import { getGenericErrorCode } from '#~/api';
import { isHardwareProfileEnabled } from '#~/pages/hardwareProfiles/utils';
import { useDashboardNamespace } from '#~/redux/selectors';
import { HardwareProfileBindingStateInfo } from '#~/concepts/hardwareProfiles/types';
import useHardwareProfile from '#~/pages/hardwareProfiles/useHardwareProfile.ts';
import { HardwareProfileBindingState } from './const';

export const useHardwareProfileBindingState = (
  resource?: NotebookKind | ModelResourceType,
): [HardwareProfileBindingStateInfo | null, boolean, Error | undefined] => {
  const { dashboardNamespace } = useDashboardNamespace();
  const hardwareProfileName =
    resource?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const hardwareProfileNamespace =
    resource?.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'] ||
    dashboardNamespace;

  if (!hardwareProfileName || !hardwareProfileNamespace) {
    return [null, true, undefined];
  }

  const [profile, loaded, loadError] = useHardwareProfile(
    hardwareProfileNamespace,
    hardwareProfileName,
  );

  if (loadError) {
    const bindingState: HardwareProfileBindingStateInfo | null =
      getGenericErrorCode(loadError) === 404
        ? {
            state: HardwareProfileBindingState.DELETED,
            profile: undefined,
          }
        : null;
    return [bindingState, true, loadError];
  }

  if (!loaded) {
    return [null, false, loadError];
  }
  const isDisabled = profile && !isHardwareProfileEnabled(profile);
  const storedResourceVersion =
    resource.metadata.annotations?.['opendatahub.io/hardware-profile-resource-version'];
  const isUpdated =
    profile && storedResourceVersion && profile.metadata.resourceVersion
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
      profile: profile ?? undefined,
    },
    loaded,
    loadError,
  ];
};

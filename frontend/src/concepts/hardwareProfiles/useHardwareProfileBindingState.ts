// eslint-disable-next-line import/no-extraneous-dependencies
import { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import { NotebookKind } from '#~/k8sTypes';
import { getGenericErrorCode } from '#~/api';
import { isHardwareProfileEnabled } from '#~/pages/hardwareProfiles/utils';
import { useDashboardNamespace } from '#~/redux/selectors';
import { HardwareProfileBindingStateInfo } from '#~/concepts/hardwareProfiles/types';
import useWatchHardwareProfile from '#~/pages/hardwareProfiles/useWatchHardwareProfile';
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
  const [profile, loaded, loadError] = useWatchHardwareProfile(
    hardwareProfileNamespace,
    hardwareProfileName,
  );
  if (!hardwareProfileName) {
    return [null, true, undefined];
  }
  if (getGenericErrorCode(loadError) === 404) {
    return [
      {
        state: HardwareProfileBindingState.DELETED,
        profile: undefined,
      },
      true,
      loadError,
    ];
  }
  if (!loaded) {
    return [null, false, loadError];
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
  const stateInfo: HardwareProfileBindingStateInfo = {
    state,
    profile,
  };

  return [stateInfo, loaded, loadError];
};

import { NotebookKind, InferenceServiceKind } from '#~/k8sTypes';
import { getGenericErrorCode } from '#~/api';
import { isHardwareProfileEnabled } from '#~/pages/hardwareProfiles/utils';
import { useDashboardNamespace } from '#~/redux/selectors';
import { HardwareProfileBindingStateInfo } from '#~/concepts/hardwareProfiles/types.ts';
import useWatchHardwareProfile from '#~/pages/hardwareProfiles/useWatchHardwareProfile.ts';
import { HardwareProfileBindingState } from './const';
import { hasHardwareProfileSpecChanged } from './utils';

type SupportedResource = NotebookKind | InferenceServiceKind;

export const useHardwareProfileBindingState = (
  resource?: SupportedResource,
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

  const storedSpecSnapshot =
    resource.metadata.annotations?.['opendatahub.io/hardware-profile-spec-snapshot'];

  const isUpdated = storedSpecSnapshot
    ? hasHardwareProfileSpecChanged(profile, storedSpecSnapshot)
    : false;

  let state: HardwareProfileBindingState | undefined;
  if (isUpdated) {
    state = HardwareProfileBindingState.UPDATED;
  } else if (isDisabled) {
    state = HardwareProfileBindingState.DISABLED;
  }

  const stateInfo: HardwareProfileBindingStateInfo = {
    state,
    profile,
  };

  return [stateInfo, loaded, loadError];
};

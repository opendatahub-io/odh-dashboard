import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookKind } from '#~/k8sTypes';
import { getGenericErrorCode } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import useHardwareProfile from '#~/pages/hardwareProfiles/useHardwareProfile';
import { REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH } from './const';

const useDeletedHardwareProfilePatches = (notebook: NotebookKind): Patch[] => {
  const { dashboardNamespace } = useDashboardNamespace();
  const hardwareProfileName =
    notebook.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const hardwareProfileNamespace =
    notebook.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'] ||
    dashboardNamespace;

  const [, loaded, loadError] = useHardwareProfile(hardwareProfileNamespace, hardwareProfileName);

  if (hardwareProfileName && loaded && loadError && getGenericErrorCode(loadError) === 404) {
    return REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH;
  }
  return [];
};

export default useDeletedHardwareProfilePatches;

import { HardwareProfileKind } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { groupVersionKind, HardwareProfileModel } from '#~/api';
import useK8sWatchResourceList from './useK8sWatchResourceList';

export const useWatchHardwareProfiles = (
  namespace: string,
): CustomWatchK8sResult<HardwareProfileKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(HardwareProfileModel),
      namespace,
    },
    HardwareProfileModel,
  );

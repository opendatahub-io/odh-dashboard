import React from 'react';
import { getHardwareProfile } from '#~/api';
import { HardwareProfileKind } from '#~/k8sTypes';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';

const useHardwareProfile = (
  namespace: string,
  name?: string,
): FetchState<HardwareProfileKind | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<HardwareProfileKind | null>>(() => {
    if (!name) {
      return Promise.reject(new NotReadyError('Hardware profile name is missing'));
    }
    return getHardwareProfile(name, namespace);
  }, [name, namespace]);

  return useFetchState(callback, null);
};

export default useHardwareProfile;

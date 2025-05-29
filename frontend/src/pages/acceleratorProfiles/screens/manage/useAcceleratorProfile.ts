import React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { getAcceleratorProfile } from '#~/api';

const useAcceleratorProfile = (
  namespace: string,
  name?: string,
): FetchState<AcceleratorProfileKind | null> => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<AcceleratorProfileKind | null>
  >(() => {
    if (!name) {
      return Promise.reject(new NotReadyError('Accelerator profile name is missing'));
    }
    return getAcceleratorProfile(name, namespace);
  }, [name, namespace]);

  return useFetchState(callback, null);
};

export default useAcceleratorProfile;

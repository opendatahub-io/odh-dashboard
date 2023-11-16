import React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { AcceleratorKind } from '~/k8sTypes';
import { getAccelerator } from '~/api';

const useAcceleratorProfile = (namespace: string, name?: string) => {
  const callback = React.useCallback<FetchStateCallbackPromise<AcceleratorKind | null>>(() => {
    if (!name) {
      return Promise.reject(new NotReadyError('Accelerator profile name is missing'));
    }
    return getAccelerator(name, namespace);
  }, [name, namespace]);

  return useFetchState(callback, null);
};

export default useAcceleratorProfile;

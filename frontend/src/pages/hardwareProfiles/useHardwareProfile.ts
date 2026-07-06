import React from 'react';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { getHardwareProfile } from '#~/api';
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
    if (!name || !namespace) {
      return Promise.reject(new NotReadyError('Hardware profile name or namespace is missing'));
    }

    return getHardwareProfile(name, namespace);
  }, [name, namespace]);

  return useFetchState(callback, null);
};

export default useHardwareProfile;

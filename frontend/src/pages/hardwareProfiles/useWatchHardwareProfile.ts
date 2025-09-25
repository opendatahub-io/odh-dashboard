import React from 'react';
import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileKind } from '#~/k8sTypes';
import { groupVersionKind, HardwareProfileModel } from '#~/api';
import { CustomWatchK8sResult } from '#~/types';

const useWatchHardwareProfile = (
  namespace: string,
  name?: string,
): CustomWatchK8sResult<HardwareProfileKind> => {
  const watchResource = React.useMemo(() => {
    if (!name) {
      return null;
    }
    return {
      groupVersionKind: groupVersionKind(HardwareProfileModel),
      name,
      namespace,
    };
  }, [name, namespace]);

  const [data, loaded, error] = useK8sWatchResource<HardwareProfileKind>(
    watchResource,
    HardwareProfileModel,
  );

  const loadError = React.useMemo(() => {
    if (error instanceof Error) {
      return error;
    }

    if (!error) {
      return undefined;
    }

    return new Error('Unknown error occurred');
  }, [error]);

  return [data, loaded, loadError];
};

export default useWatchHardwareProfile;

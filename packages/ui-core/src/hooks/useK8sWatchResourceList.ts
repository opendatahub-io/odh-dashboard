import React from 'react';
import {
  type K8sModelCommon,
  type K8sResourceCommon,
  type WatchK8sResource,
  type WebSocketOptions,
  useK8sWatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { isK8sStatus, K8sStatusError, type K8sWatchResult } from '@odh-dashboard/k8s-core';

const useK8sWatchResourceList = <T extends K8sResourceCommon[]>(
  initResource: WatchK8sResource | null,
  initModel?: K8sModelCommon,
  options?: Partial<WebSocketOptions & RequestInit & { wsPrefix?: string; pathPrefix?: string }>,
): K8sWatchResult<T> => {
  const initListResource = React.useMemo(
    () => (initResource != null ? { ...initResource, isList: true } : null),
    [initResource],
  );
  const [data, loaded, error] = useK8sWatchResource<T>(initListResource, initModel, options);
  const loadError = React.useMemo(() => {
    if (error instanceof Error) {
      return error;
    }
    if (!error) {
      return undefined;
    }
    if (isK8sStatus(error)) {
      return new K8sStatusError(error);
    }
    return new Error('Unknown error occured');
  }, [error]);

  const normalizedData = React.useMemo(
    // The SDK type does not reflect that watch data is undefined before the first result.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    () => data ?? [],
    [data],
  );

  return [normalizedData, loaded, loadError];
};

export default useK8sWatchResourceList;

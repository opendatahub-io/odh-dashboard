import React from 'react';
import {
  type K8sModelCommon,
  type K8sResourceCommon,
  type WatchK8sResource,
  type WebSocketOptions,
  useK8sWatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { isK8sStatus, K8sStatusError, type K8sWatchResult } from '@odh-dashboard/k8s-core';

/**
 * Watches a Kubernetes resource list while normalizing list and error semantics for consumers.
 * The hook always sets `isList: true`, preserves native errors, converts Kubernetes status
 * responses to `K8sStatusError`, and returns a memoized empty list while the SDK has no data.
 *
 * @param initResource - Resource watch configuration, or `null` to disable the watch.
 * @param initModel - Optional Kubernetes model used by the SDK watch.
 * @param options - Optional WebSocket and request options passed to the SDK watch.
 * @returns Watched list data, its loaded state, and any normalized load error.
 */
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

  // disable as data can be `undefined` by the type in the SDK is incorrect
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return [React.useMemo(() => data ?? [], [data]), loaded, loadError];
};

export default useK8sWatchResourceList;

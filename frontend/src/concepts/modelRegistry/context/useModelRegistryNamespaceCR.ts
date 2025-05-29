import React from 'react';
import { getModelRegistryCR } from '#~/api';
import { ModelRegistryKind } from '#~/k8sTypes';
import useModelRegistryEnabled from '#~/concepts/modelRegistry/useModelRegistryEnabled';
import { FAST_POLL_INTERVAL, SERVER_TIMEOUT } from '#~/utilities/const';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';

type State = ModelRegistryKind | null;

export const isModelRegistryCRStatusAvailable = (cr: ModelRegistryKind): boolean =>
  !!cr.status?.conditions?.find((c) => c.type === 'Available' && c.status === 'True');

export const isModelRegistryAvailable = ([state, loaded]: FetchState<State>): boolean =>
  loaded && !!state && isModelRegistryCRStatusAvailable(state);

export const useModelRegistryNamespaceCR = (
  namespace: string | undefined,
  name: string,
): FetchState<State> => {
  const modelRegistryAreaAvailable = useModelRegistryEnabled();

  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!modelRegistryAreaAvailable) {
        return Promise.reject(new NotReadyError('Model registry not enabled'));
      }

      if (!namespace) {
        return Promise.reject(new NotReadyError('No registries namespace could be found'));
      }

      return getModelRegistryCR(namespace, name, opts).catch((e) => {
        if (e.statusObject?.code === 404) {
          // Not finding is okay, not an error
          return null;
        }
        throw e;
      });
    },
    [namespace, name, modelRegistryAreaAvailable],
  );

  const [isStarting, setIsStarting] = React.useState(false);

  const state = useFetchState<State>(callback, null, {
    initialPromisePurity: true,
    refreshRate: isStarting ? FAST_POLL_INTERVAL : undefined,
  });

  const resourceLoaded = state[1] && !!state[0];
  const hasStatus = isModelRegistryAvailable(state);
  React.useEffect(() => {
    setIsStarting(resourceLoaded && !hasStatus);
  }, [hasStatus, resourceLoaded]);

  return state;
};

export const hasServerTimedOut = (
  [state, loaded]: FetchState<State>,
  isCRReady: boolean,
): boolean => {
  if (!state || !loaded || isCRReady) {
    return false;
  }

  const createTime = state.metadata.creationTimestamp;
  if (!createTime) {
    return false;
  }

  // If we are here, and 5 mins have past, we are having issues
  return Date.now() - new Date(createTime).getTime() > SERVER_TIMEOUT;
};

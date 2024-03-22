import React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { getModelRegistryAPIRoute } from '~/api/';
import { RouteKind } from '~/k8sTypes';
import { FAST_POLL_INTERVAL } from '~/utilities/const';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

type State = string | null;

// TODO: Ask the model registry team to provide a route rather than a service!!
const useModelRegistryAPIRoute = (
  hasCR: boolean,
  modelRegistryName: string,
  namespace: string,
): FetchState<State> => {
  const modelRegistryAreaAvailable = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY).status;
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!modelRegistryAreaAvailable) {
        return Promise.reject(new NotReadyError('Model registry not enabled'));
      }

      if (!hasCR) {
        return Promise.reject(new NotReadyError('CR not created'));
      }

      return getModelRegistryAPIRoute(namespace, modelRegistryName, opts)
        .then((result: RouteKind) => `http://${result.spec.host}`) // TODO: check why it's not working with https!!!
        .catch((e) => {
          if (e.statusObject?.code === 404) {
            // Not finding is okay, not an error
            return null;
          }
          throw e;
        });
    },
    [hasCR, modelRegistryName, namespace, modelRegistryAreaAvailable],
  );

  const state = useFetchState<State>(callback, null, {
    initialPromisePurity: true,
  });

  const [data, , , refresh] = state;

  const hasData = !!data;
  React.useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (!hasData) {
      interval = setInterval(refresh, FAST_POLL_INTERVAL);
    }
    return () => {
      clearInterval(interval);
    };
  }, [hasData, refresh]);
  return state;
};

export default useModelRegistryAPIRoute;

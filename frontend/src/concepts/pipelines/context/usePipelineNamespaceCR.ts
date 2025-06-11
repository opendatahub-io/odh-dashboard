import * as React from 'react';
import { DSPipelineKind } from '#~/k8sTypes';
import { getPipelinesCR, listPipelinesCR } from '#~/api';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { FAST_POLL_INTERVAL, SERVER_TIMEOUT } from '#~/utilities/const';

type State = DSPipelineKind | null;

export const dspaLoaded = ([state, loaded]: FetchState<State>): boolean =>
  loaded &&
  !!state &&
  !!state.status?.conditions?.find((c) => c.type === 'APIServerReady' && c.status === 'True');

export const hasServerTimedOut = (
  [state, loaded]: FetchState<State>,
  isDspaLoaded: boolean,
): boolean => {
  if (!state || !loaded || isDspaLoaded) {
    return false;
  }

  const createTime = state.metadata.creationTimestamp;
  if (!createTime) {
    return false;
  }

  // If we are here, and 5 mins have past, we are having issues
  return Date.now() - new Date(createTime).getTime() > SERVER_TIMEOUT;
};

const usePipelineNamespaceCR = (namespace: string): FetchState<State> => {
  const [name, setName] = React.useState<string>();
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (name) {
        return getPipelinesCR(namespace, name, opts).catch((e) => {
          if (e.statusObject?.code === 404) {
            setName(undefined);
            return null;
          }

          throw e;
        });
      }

      return listPipelinesCR(namespace, opts).then((r) => {
        if (r.length > 0) {
          setName(r[0].metadata.name);
          return r[0];
        }

        return null;
      });
    },
    [name, namespace],
  );

  const [isStarting, setIsStarting] = React.useState(false);

  const state = useFetchState<State>(callback, null, {
    initialPromisePurity: true,
    refreshRate: isStarting ? FAST_POLL_INTERVAL : undefined,
  });

  const resourceLoaded = state[1] && !!state[0];
  const hasStatus = dspaLoaded(state);
  React.useEffect(() => {
    setIsStarting(resourceLoaded && !hasStatus);
  }, [hasStatus, resourceLoaded]);

  return state;
};

export default usePipelineNamespaceCR;

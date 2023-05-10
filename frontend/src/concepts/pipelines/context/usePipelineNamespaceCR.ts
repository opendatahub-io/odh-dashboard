import * as React from 'react';
import { DSPipelineKind } from '~/k8sTypes';
import { getPipelinesCR } from '~/api';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { FAST_POLL_INTERVAL } from '~/utilities/const';

type State = DSPipelineKind | null;

export const dspaLoaded = ([state, loaded]: FetchState<State>): boolean =>
  loaded &&
  !!state &&
  !!state.status?.conditions?.find((c) => c.type === 'APIServerReady' && c.status === 'True');

const usePipelineNamespaceCR = (namespace: string): FetchState<State> => {
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) =>
      getPipelinesCR(namespace, opts).catch((e) => {
        if (e.statusObject?.code === 404) {
          // Not finding is okay, not an error
          return null;
        }
        throw e;
      }),
    [namespace],
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

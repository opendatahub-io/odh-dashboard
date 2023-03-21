import * as React from 'react';
import { RouteKind } from '~/k8sTypes';
import { getPipelineAPIRoute } from '~/api';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { FAST_POLL_INTERVAL } from '~/utilities/const';

type State = string | null;

const usePipelinesAPIRoute = (hasCR: boolean, namespace: string): FetchState<State> => {
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) =>
      // TODO: fetch from namespace only when we have CR
      getPipelineAPIRoute(namespace, opts)
        .then((result: RouteKind) => `https://${result.spec.host}`)
        .catch((e) => {
          if (e.statusObject?.code === 404) {
            // Not finding is okay, not an error
            return null;
          }
          throw e;
        }),
    [namespace],
  );

  const ref = React.useRef(false);
  const refreshInterval = !ref.current && hasCR ? FAST_POLL_INTERVAL : undefined;
  const fetchState = useFetchState<State>(callback, null, refreshInterval);

  if (fetchState[0]) {
    ref.current = true;
  }

  return fetchState;
};

export default usePipelinesAPIRoute;

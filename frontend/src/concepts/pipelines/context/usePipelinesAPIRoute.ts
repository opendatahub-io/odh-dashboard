import * as React from 'react';
import { RouteKind } from '#~/k8sTypes';
import { getPipelineAPIRoute } from '#~/api';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';
import { PIPELINE_ROUTE_NAME_PREFIX } from '#~/concepts/pipelines/const';

type State = string | null;

const usePipelinesAPIRoute = (
  hasCR: boolean,
  dspaName: string,
  namespace: string,
): FetchState<State> => {
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!hasCR) {
        return Promise.reject(new NotReadyError('CR not created'));
      }

      return getPipelineAPIRoute(namespace, PIPELINE_ROUTE_NAME_PREFIX + dspaName, opts)
        .then((result: RouteKind) => `https://${result.spec.host}`)
        .catch((e) => {
          if (e.statusObject?.code === 404) {
            // Not finding is okay, not an error
            return null;
          }
          throw e;
        });
    },
    [hasCR, dspaName, namespace],
  );

  const state = useFetchState<State>(callback, null, {
    initialPromisePurity: true,
  });

  // TODO: Consider baking this into useFetchState -- webhooks will make it obsolete
  const [data, , , refresh] = state;
  const hasData = !!data;
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (!hasData) {
      interval = setInterval(refresh, FAST_POLL_INTERVAL);
    }
    return () => {
      clearInterval(interval);
    };
  }, [hasData, refresh]);

  return state;
};

export default usePipelinesAPIRoute;

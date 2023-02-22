import * as React from 'react';
import { RouteKind } from '../../../k8sTypes';
import { getPipelineAPIRoute } from '../../../api';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
} from '../../../concepts/generic/useFetchState';

const usePipelinesAPIRoute = (hasCR: boolean, namespace: string): FetchState<RouteKind> => {
  const callback = React.useCallback<FetchStateCallbackPromise<RouteKind>>(
    (opts) => {
      if (hasCR) {
        console.debug('Has resource... fetching route');
      } else {
        console.debug('Not looking for a route yet in', namespace);
        // TODO: Do nothing
      }
      // TODO: fetch from namespace only when we have CR
      return getPipelineAPIRoute(namespace, opts).then((result) => {
        return result; // maybe convert to a string?
      });
    },
    [hasCR, namespace],
  );

  return useFetchState<RouteKind>(callback);
};

export default usePipelinesAPIRoute;

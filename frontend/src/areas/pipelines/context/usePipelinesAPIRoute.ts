import * as React from 'react';
import { RouteKind } from '../../../k8sTypes';
import { getPipelineAPIRoute } from '../../../api';

const usePipelinesAPIRoute = (
  hasCR: boolean,
  namespace: string,
): [route: RouteKind | null, loaded: boolean, loadError: Error | undefined] => {
  const [route, setRoute] = React.useState<RouteKind | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    if (hasCR) {
      console.debug('Has resource... fetching route');
    } else {
      console.debug('Not looking for a route yet in', namespace);
      // TODO: Do nothing
    }
    // TODO: fetch from namespace only when we have CR
    getPipelineAPIRoute(namespace)
      .then((route) => {
        setLoadError(undefined);
        setRoute(route); // TODO: This may be convert to a string -- doubt we need the whole object
        setLoaded(true);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, [hasCR, namespace]);

  return [route, loaded, loadError];
};

export default usePipelinesAPIRoute;

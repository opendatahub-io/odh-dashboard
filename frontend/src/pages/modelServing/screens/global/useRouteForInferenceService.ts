import * as React from 'react';
import { InferenceServiceKind } from '~/k8sTypes';
import { getRoute } from '~/api';

const useRouteForInferenceService = (
  inferenceService: InferenceServiceKind,
  isRouteEnabled: boolean,
): [
  routeLink: string | null,
  routeLinkGRPC: string | null,
  loaded: boolean,
  loadError: Error | null,
] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [routeGRPC, setRouteGRPC] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  const routeName = inferenceService.metadata.name;
  const routeNameGRPC = `${routeName}-grpc`;
  const routeNamespace = inferenceService.metadata.namespace;

  React.useEffect(() => {
    if (!isRouteEnabled) {
      setLoadError(null);
      setLoaded(true);
      return;
    }
    Promise.allSettled([
      getRoute(routeName, routeNamespace),
      getRoute(routeNameGRPC, routeNamespace),
    ])
      .then(([route, routeGRPC]) => {
        if (route.status === 'fulfilled') {
          setRoute(`https://${route.value.spec.host}${route.value.spec.path}`);
        }
        if (routeGRPC.status === 'fulfilled') {
          setRouteGRPC(`${routeGRPC.value.spec.host}${routeGRPC.value.spec.path}`);
        }
      })
      .catch((e) => {
        if (e.response.status !== 404) {
          setLoadError(e);
        }
      })
      .finally(() => {
        setLoaded(true);
      });
  }, [routeName, routeNameGRPC, routeNamespace, isRouteEnabled]);

  return [route, routeGRPC, loaded, loadError];
};

export default useRouteForInferenceService;

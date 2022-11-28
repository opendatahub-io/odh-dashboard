import * as React from 'react';
import { InferenceServiceKind } from '../../../../k8sTypes';
import { getRoute } from '../../../../api';

const useRouteForInferenceService = (
  inferenceService: InferenceServiceKind,
  isRouteEnabled: boolean,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  const routeName = inferenceService.metadata.name;
  const routeNamespace = inferenceService.metadata.namespace;

  React.useEffect(() => {
    if (!isRouteEnabled) {
      setLoadError(null);
      setLoaded(true);
      return;
    }
    getRoute(routeName, routeNamespace)
      .then((route) => {
        setRoute(`https://${route.spec.host}${route.spec.path}`);
        setLoaded(true);
      })
      .catch((e) => {
        setLoadError(e);
        setLoaded(true);
      });
  }, [routeName, routeNamespace, isRouteEnabled]);

  return [route, loaded, loadError];
};

export default useRouteForInferenceService;

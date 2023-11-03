import * as React from 'react';
import { InferenceServiceKind } from '~/k8sTypes';
import { getRoute } from '~/api';
import { getUrlFromKserveInferenceService } from '~/pages/modelServing/screens/projects/utils';

const useRouteForInferenceService = (
  inferenceService: InferenceServiceKind,
  isRouteEnabled: boolean,
  isKServe?: boolean,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  const routeName = inferenceService.metadata.name;
  const routeNamespace = inferenceService.metadata.namespace;
  const kserveRoute = isKServe ? getUrlFromKserveInferenceService(inferenceService) : null;

  React.useEffect(() => {
    if (isKServe) {
      setRoute(kserveRoute || null);
      setLoaded(true);
      setLoadError(kserveRoute ? null : new Error('Route not found'));
      return;
    }
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
  }, [routeName, routeNamespace, isRouteEnabled, kserveRoute, isKServe]);

  return [route, loaded, loadError];
};

export default useRouteForInferenceService;

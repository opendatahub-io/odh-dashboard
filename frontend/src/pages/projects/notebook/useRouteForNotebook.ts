import * as React from 'react';
import { getRoute } from '../../../api';
import { NotebookKind } from '../../../k8sTypes';

const useRouteForNotebook = (
  notebook: NotebookKind,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  const routeName = notebook.metadata.name;
  const routeNamespace = notebook.metadata.namespace;

  React.useEffect(() => {
    let watchHandle;
    const watchRoute = () => {
      getRoute(routeName, routeNamespace)
        .then((route) => {
          setRoute(`https://${route.spec.host}/notebook/${routeNamespace}/${routeName}`);
          setLoaded(true);
        })
        .catch((e) => {
          setLoadError(e);
          watchHandle = setTimeout(watchRoute, 1000);
        });
    };
    watchRoute();
    return () => clearTimeout(watchHandle);
  }, [routeName, routeNamespace]);

  return [route, loaded, loadError];
};

export default useRouteForNotebook;
